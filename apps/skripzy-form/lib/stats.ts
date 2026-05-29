export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function variance(arr: number[], sample = true): number {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  const sumSq = arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0);
  return sumSq / (arr.length - (sample ? 1 : 0));
}

export function covariance(x: number[], y: number[], sample = true): number {
  if (x.length !== y.length || x.length === 0) return 0;
  const mx = mean(x);
  const my = mean(y);
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - mx) * (y[i] - my);
  }
  return sum / (x.length - (sample ? 1 : 0));
}

export function pearsonCorrelation(x: number[], y: number[]): number {
  const cov = covariance(x, y);
  const sx = Math.sqrt(variance(x));
  const sy = Math.sqrt(variance(y));
  if (sx === 0 || sy === 0) return 0;
  return cov / (sx * sy);
}

// Compute Cronbach's Alpha given a 2D array: [item1_scores, item2_scores, ...]
export function cronbachAlpha(itemScores: number[][]): number {
  if (itemScores.length < 2) return 0;
  const k = itemScores.length;
  const itemVariances = itemScores.map(scores => variance(scores));
  const sumItemVariances = itemVariances.reduce((a, b) => a + b, 0);

  // Compute total scores for each respondent
  const nRespondents = itemScores[0].length;
  const totalScores = new Array(nRespondents).fill(0);
  
  for (let r = 0; r < nRespondents; r++) {
    for (let c = 0; c < k; c++) {
      totalScores[r] += itemScores[c][r];
    }
  }

  const varTotal = variance(totalScores);
  if (varTotal === 0) return 0;

  return (k / (k - 1)) * (1 - (sumItemVariances / varTotal));
}

// Simple linear regression: y = beta * x + alpha
export function linearRegression(x: number[], y: number[]) {
  const mX = mean(x);
  const mY = mean(y);
  
  let num = 0;
  let den = 0;
  for (let i = 0; i < x.length; i++) {
    num += (x[i] - mX) * (y[i] - mY);
    den += Math.pow((x[i] - mX), 2);
  }
  
  const beta = den === 0 ? 0 : num / den;
  const alpha = mY - (beta * mX);
  
  // Calculate R and R^2
  const r = pearsonCorrelation(x, y);
  const rSquared = Math.pow(r, 2);
  
  return { beta, alpha, r, rSquared };
}
