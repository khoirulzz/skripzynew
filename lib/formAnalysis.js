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

export function getRCriticalValue(N) {
  if (N < 3) return 1.0;
  const df = N - 2;
  const table = {
    1: 0.997, 2: 0.950, 3: 0.878, 4: 0.811, 5: 0.754, 6: 0.707, 7: 0.666, 8: 0.632, 9: 0.602, 10: 0.576,
    11: 0.553, 12: 0.532, 13: 0.514, 14: 0.497, 15: 0.482, 16: 0.468, 17: 0.456, 18: 0.444, 19: 0.433, 20: 0.423,
    21: 0.413, 22: 0.404, 23: 0.396, 24: 0.388, 25: 0.381, 26: 0.374, 27: 0.367, 28: 0.361, 29: 0.355, 30: 0.349,
    35: 0.325, 40: 0.304, 45: 0.288, 50: 0.273, 60: 0.250, 70: 0.232, 80: 0.217, 90: 0.205, 100: 0.195,
    200: 0.138, 300: 0.113, 400: 0.098, 500: 0.088
  };
  
  if (table[df] !== undefined) return table[df];
  
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (df > keys[i] && df < keys[i+1]) {
      const x0 = keys[i], x1 = keys[i+1];
      const y0 = table[x0], y1 = table[x1];
      return y0 + ((df - x0) * (y1 - y0)) / (x1 - x0);
    }
  }
  
  if (df > 500) {
    return 1.96 / Math.sqrt(1.96 * 1.96 + df);
  }
  
  return 0.3;
}

export function getTCriticalValue(df) {
  if (df < 1) return 1.96;
  const table = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131, 16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
    21: 2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060, 26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042,
    40: 2.021, 50: 2.009, 60: 2.000, 80: 1.990, 100: 1.984, 120: 1.980, 200: 1.972, 500: 1.965
  };
  if (table[df] !== undefined) return table[df];
  
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (df > keys[i] && df < keys[i+1]) {
      const x0 = keys[i], x1 = keys[i+1];
      const y0 = table[x0], y1 = table[x1];
      return y0 + ((df - x0) * (y1 - y0)) / (x1 - x0);
    }
  }
  
  return 1.96;
}

export function computeVariableAnalysis(variable, responses = []) {
  // variable is a Section object with: id, title, questions, description
  const questions = variable.questions || [];
  const quantQuestions = questions.filter((q) =>
    ["likert5", "number", "likert", "rating"].includes(q.type) || q.type.startsWith("likert")
  );

  const rows = responses
    .map((resp) => {
      const scores = quantQuestions.map((q) => toNumber(resp.answers?.[q.id]));
      if (scores.some((s) => s === null)) return null;
      return scores;
    })
    .filter(Boolean);

  const N = rows.length;
  const totals = rows.map((row) => row.reduce((sum, val) => sum + val, 0));

  // Cronbach's Alpha
  let cronbachAlpha = 0;
  let isReliable = false;
  if (quantQuestions.length > 1 && N >= 2) {
    const totalVar = variance(totals);
    const itemVars = quantQuestions.map((_, colIdx) =>
      variance(rows.map((row) => row[colIdx]))
    );
    const varSum = itemVars.reduce((sum, val) => sum + val, 0);
    if (totalVar > 0) {
      cronbachAlpha =
        (quantQuestions.length / (quantQuestions.length - 1)) * (1 - varSum / totalVar);
    }
    isReliable = cronbachAlpha >= 0.6;
  }

  // Pearson validity per question
  const rCritical = getRCriticalValue(N);
  const itemStats = quantQuestions.map((question, colIdx) => {
    const series = rows.map((row) => row[colIdx]);
    const correctedTotals = rows.map((row) =>
      row.reduce((sum, val, rIdx) => (rIdx === colIdx ? sum : sum + val), 0)
    );
    const rCalculated = pearsonCorrelation(series, correctedTotals);
    const isValid = rCalculated >= rCritical;

    const avg = mean(series);
    const v = variance(series);
    const minVal = series.length ? Math.min(...series) : 0;
    const maxVal = series.length ? Math.max(...series) : 0;

    return {
      questionId: question.id,
      label: question.label,
      variableKey: question.variableKey,
      mean: Number(avg.toFixed(3)),
      variance: Number(v.toFixed(3)),
      stdDev: Number(Math.sqrt(v).toFixed(3)),
      rCalculated: Number(rCalculated.toFixed(3)),
      rCritical: Number(rCritical.toFixed(3)),
      isValid,
      min: minVal,
      max: maxVal,
    };
  });

  // Auto Scoring
  const averageTotalScore = mean(totals);
  let maxPossibleTotal = 0;
  quantQuestions.forEach((q) => {
    const maxScale = q.scale?.max || 5;
    maxPossibleTotal += maxScale;
  });
  const minPossibleTotal = quantQuestions.length;

  const scorePercent =
    maxPossibleTotal > minPossibleTotal
      ? ((averageTotalScore - minPossibleTotal) / (maxPossibleTotal - minPossibleTotal)) * 100
      : 0;

  let category = "Sedang";
  if (scorePercent >= 80) category = "Sangat Tinggi";
  else if (scorePercent >= 60) category = "Tinggi";
  else if (scorePercent >= 40) category = "Sedang";
  else category = "Rendah";

  const distributions = questions
    .filter((q) => q.type !== "sectionText")
    .map((q) => getDistributionForQuestion(q, responses));

  return {
    N,
    cronbachAlpha: Number(cronbachAlpha.toFixed(3)),
    isReliable,
    itemStats,
    distributions,
    averageTotalScore: Number(averageTotalScore.toFixed(3)),
    category,
    scorePercent: Number(scorePercent.toFixed(1)),
  };
}

export function computeRegressionAnalysis(varX, varY, responses = []) {
  const questionsX = varX.questions || [];
  const questionsY = varY.questions || [];

  const quantX = questionsX.filter((q) =>
    ["likert5", "number", "likert", "rating"].includes(q.type) || q.type.startsWith("likert")
  );
  const quantY = questionsY.filter((q) =>
    ["likert5", "number", "likert", "rating"].includes(q.type) || q.type.startsWith("likert")
  );

  if (quantX.length === 0 || quantY.length === 0) {
    throw new Error("Kedua variabel harus memiliki setidaknya satu pertanyaan kuantitatif.");
  }

  const dataPairs = responses
    .map((resp) => {
      const scoresX = quantX.map((q) => toNumber(resp.answers?.[q.id]));
      const scoresY = quantY.map((q) => toNumber(resp.answers?.[q.id]));

      if (scoresX.some((s) => s === null) || scoresY.some((s) => s === null)) return null;

      const totalX = scoresX.reduce((sum, val) => sum + val, 0);
      const totalY = scoresY.reduce((sum, val) => sum + val, 0);
      return { x: totalX, y: totalY };
    })
    .filter(Boolean);

  const N = dataPairs.length;
  if (N < 3) {
    throw new Error("Jumlah responden data lengkap (tanpa nilai kosong) minimal 3 untuk regresi.");
  }

  const seriesX = dataPairs.map((p) => p.x);
  const seriesY = dataPairs.map((p) => p.y);

  const meanX = mean(seriesX);
  const meanY = mean(seriesY);

  let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0, sumXY = 0;
  for (let i = 0; i < N; i++) {
    const x = seriesX[i];
    const y = seriesY[i];
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
  }

  const SS_xx = sumXX - (sumX * sumX) / N;
  const SS_yy = sumYY - (sumY * sumY) / N;
  const SS_xy = sumXY - (sumX * sumY) / N;

  if (SS_xx === 0) {
    throw new Error("Varians nilai Variabel Independen X adalah nol. Regresi tidak dapat dihitung.");
  }

  const b = SS_xy / SS_xx;
  const a = meanY - b * meanX;

  const r = SS_xy / Math.sqrt(SS_xx * SS_yy || 1);
  const rSquared = r * r;
  const adjRSquared = 1 - ((1 - rSquared) * (N - 1)) / (N - 2);

  let sumResSq = 0;
  for (let i = 0; i < N; i++) {
    const predY = a + b * seriesX[i];
    const residual = seriesY[i] - predY;
    sumResSq += residual * residual;
  }

  const seEstimate = Math.sqrt(sumResSq / (N - 2));
  const seSlope = seEstimate / Math.sqrt(SS_xx);
  const seIntercept = seEstimate * Math.sqrt(1 / N + (meanX * meanX) / SS_xx);

  const tStat = b / seSlope;
  const df = N - 2;
  const tCritical = getTCriticalValue(df);
  const isSignificant = Math.abs(tStat) >= tCritical;

  return {
    N,
    df,
    meanX: Number(meanX.toFixed(3)),
    meanY: Number(meanY.toFixed(3)),
    slope: Number(b.toFixed(4)),
    intercept: Number(a.toFixed(4)),
    rCorrelation: Number(r.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
    adjRSquared: Number(adjRSquared.toFixed(4)),
    seEstimate: Number(seEstimate.toFixed(4)),
    seSlope: Number(seSlope.toFixed(4)),
    seIntercept: Number(seIntercept.toFixed(4)),
    tStat: Number(tStat.toFixed(4)),
    tCritical: Number(tCritical.toFixed(4)),
    isSignificant,
    equation: `Y = ${a.toFixed(3)} ${b >= 0 ? "+" : "-"} ${Math.abs(b).toFixed(3)}X`,
  };
}

export function computeFormAnalysis(form, responses = []) {
  // Fallback function for compatibility
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
      label: question.label,
      variableKey: question.variableKey,
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
  const topDistribution = analysis.distributions?.find((item) => item.distribution?.length > 0);
  const bestItem = [...(analysis.itemStats || [])].sort((left, right) => right.mean - left.mean)[0];

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

  return parts.join(" ");
}
