import { flattenFormQuestions } from "./workspaceDefaults";

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / (values.length - 1);
}

function pearsonCorrelation(seriesA, seriesB) {
  if (seriesA.length !== seriesB.length || seriesA.length < 2) return 0;

  const meanA = mean(seriesA);
  const meanB = mean(seriesB);
  let numerator = 0;
  let left = 0;
  let right = 0;

  for (let index = 0; index < seriesA.length; index += 1) {
    const deltaA = seriesA[index] - meanA;
    const deltaB = seriesB[index] - meanB;
    numerator += deltaA * deltaB;
    left += deltaA * deltaA;
    right += deltaB * deltaB;
  }

  if (left === 0 || right === 0) return 0;
  return numerator / Math.sqrt(left * right);
}

function normalizeLabeledAnswer(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value;
}

function getDistributionForQuestion(question, responses) {
  const counts = new Map();
  let answered = 0;

  responses.forEach((response) => {
    const rawValue = response.answers?.[question.id];
    if (rawValue === undefined || rawValue === null || rawValue === "") return;

    answered += 1;
    const value = normalizeLabeledAnswer(rawValue);
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        counts.set(entry, (counts.get(entry) || 0) + 1);
      });
      return;
    }
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  const distribution = Array.from(counts.entries())
    .map(([label, count]) => ({
      label: String(label),
      count,
      percentage: answered ? Number(((count / answered) * 100).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.count - left.count);

  return {
    questionId: question.id,
    variableKey: question.variableKey,
    label: question.label,
    type: question.type,
    answered,
    distribution,
  };
}

export function computeFormAnalysis(form, responses = []) {
  const questions = flattenFormQuestions(form);
  const quantitativeQuestions = questions.filter((question) => ["likert5", "number"].includes(question.type));

  const quantitativeRows = responses
    .map((response) => {
      const values = quantitativeQuestions.map((question) => toNumber(response.answers?.[question.id]));
      if (values.some((value) => value === null)) return null;
      return values;
    })
    .filter(Boolean);

  const totals = quantitativeRows.map((row) => row.reduce((sum, value) => sum + value, 0));
  const totalVariance = variance(totals);
  const itemVariances = quantitativeQuestions.map((_, columnIndex) =>
    variance(quantitativeRows.map((row) => row[columnIndex]))
  );
  const varianceSum = itemVariances.reduce((sum, value) => sum + value, 0);
  const cronbachAlpha =
    quantitativeQuestions.length > 1 && totalVariance > 0
      ? (quantitativeQuestions.length / (quantitativeQuestions.length - 1)) * (1 - varianceSum / totalVariance)
      : 0;

  const itemStats = quantitativeQuestions.map((question, columnIndex) => {
    const series = quantitativeRows.map((row) => row[columnIndex]);
    const correctedTotals = quantitativeRows.map((row) =>
      row.reduce((sum, value, rowIndex) => (rowIndex === columnIndex ? sum : sum + value), 0)
    );

    return {
      questionId: question.id,
      variableKey: question.variableKey,
      label: question.label,
      mean: Number(mean(series).toFixed(3)),
      variance: Number(variance(series).toFixed(3)),
      itemTotalCorrelation: Number(pearsonCorrelation(series, correctedTotals).toFixed(3)),
      min: series.length ? Math.min(...series) : 0,
      max: series.length ? Math.max(...series) : 0,
    };
  });

  const distributions = questions
    .filter((question) => question.type !== "sectionText")
    .map((question) => getDistributionForQuestion(question, responses));

  return {
    generatedAt: new Date().toISOString(),
    responseCount: responses.length,
    quantitativeResponseCount: quantitativeRows.length,
    quantitativeQuestionCount: quantitativeQuestions.length,
    cronbachAlpha: Number(cronbachAlpha.toFixed(3)),
    itemStats,
    distributions,
    unansweredQuestions: questions
      .filter((question) => question.type !== "sectionText")
      .filter((question) => !responses.some((response) => response.answers?.[question.id]))
      .map((question) => ({
        questionId: question.id,
        label: question.label,
        variableKey: question.variableKey,
      })),
  };
}

export function buildAnalysisNarrative(form, analysis, transcripts = []) {
  const questionCount = flattenFormQuestions(form).filter((question) => question.type !== "sectionText").length;
  const topDistribution = analysis.distributions.find((item) => item.distribution.length > 0);
  const bestItem = [...analysis.itemStats].sort((left, right) => right.mean - left.mean)[0];

  const parts = [
    `Jumlah butir pertanyaan aktif: ${questionCount}.`,
    `Respons terkumpul: ${analysis.responseCount}.`,
  ];

  if (analysis.quantitativeQuestionCount > 0) {
    parts.push(`Nilai Cronbach Alpha instrumen sebesar ${analysis.cronbachAlpha}.`);
  }

  if (bestItem) {
    parts.push(`Butir dengan rerata tertinggi adalah "${bestItem.label}" dengan mean ${bestItem.mean}.`);
  }

  if (topDistribution?.distribution?.[0]) {
    parts.push(
      `Distribusi paling dominan muncul pada "${topDistribution.label}" dengan jawaban "${topDistribution.distribution[0].label}" sebanyak ${topDistribution.distribution[0].count} respons.`
    );
  }

  if (transcripts.length) {
    parts.push(`Tersedia ${transcripts.length} transkrip wawancara yang dapat dipakai untuk pengayaan pembahasan kualitatif.`);
  }

  return parts.join(" ");
}
