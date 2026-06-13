import * as ss from 'simple-statistics';
import jStat from 'jstat';

export function getNumericColumn(dataset: any[], colName: string) {
  let missingCount = 0;
  const data = dataset
    .map(row => {
      const val = Number(row[colName]);
      if (isNaN(val) || row[colName] === '' || row[colName] == null) {
        missingCount++;
        return NaN;
      }
      return val;
    })
    .filter(val => !isNaN(val));
    
  return { data, missingCount };
}

export function runDescriptives(dataset: any[], variables: string[]) {
  let totalMissing = 0;
  
  const results = variables.map(v => {
    const { data, missingCount } = getNumericColumn(dataset, v);
    totalMissing += missingCount;
    
    if (data.length === 0) return { Variabel: v, N: 0, Rata_rata: null, SD: null, Min: null, Max: null };
    
    return {
      Variabel: v,
      N: data.length,
      Rata_rata: ss.mean(data),
      SD: ss.standardDeviation(data),
      Varians: ss.variance(data),
      Skewness: ss.sampleSkewness(data),
      Kurtosis: ss.sampleKurtosis(data),
      Min: ss.min(data),
      Max: ss.max(data)
    };
  });
  
  return {
    title: 'Statistik Deskriptif',
    type: 'table' as const,
    missingCount: totalMissing,
    content: {
      columns: ['Variabel', 'N', 'Rata_rata', 'SD', 'Varians', 'Skewness', 'Kurtosis', 'Min', 'Max'],
      data: results
    }
  };
}

export function runPearsonCorrelation(dataset: any[], varX: string, varY: string) {
  const dataX: number[] = [];
  const dataY: number[] = [];
  let missingCount = 0;
  
  for (let i = 0; i < dataset.length; i++) {
    const xVal = dataset[i][varX];
    const yVal = dataset[i][varY];
    const x = Number(xVal);
    const y = Number(yVal);
    if (!isNaN(x) && xVal !== '' && xVal != null && !isNaN(y) && yVal !== '' && yVal != null) {
      dataX.push(x);
      dataY.push(y);
    } else {
      missingCount++;
    }
  }

  if (dataX.length < 2) {
    throw new Error("Data tidak cukup untuk korelasi");
  }

  const r = ss.sampleCorrelation(dataX, dataY);
  const n = dataX.length;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - 2));

  // Chart data for scatter plot
  const chartData = dataX.map((x, i) => ({ x, y: dataY[i] }));

  return {
    title: `Korelasi Pearson: ${varX} & ${varY}`,
    type: 'table' as const,
    missingCount,
    chartType: 'scatter' as const,
    chartData,
    chartLabels: { x: varX, y: varY },
    content: {
      columns: ['Variabel X', 'Variabel Y', 'r', 'p-value', 'n'],
      data: [{
        'Variabel X': varX,
        'Variabel Y': varY,
        r,
        'p-value': pValue,
        n
      }]
    }
  };
}

export function runTTest(dataset: any[], varNumeric: string, varGroup: string) {
  let missingCount = 0;
  const groups: Record<string, number[]> = {};
  
  for (const row of dataset) {
    const vVal = row[varNumeric];
    const gVal = row[varGroup];
    
    const v = Number(vVal);
    const g = gVal != null ? String(gVal).trim() : '';
    
    if (isNaN(v) || vVal === '' || vVal == null || g === '' || g === 'undefined' || g === 'null') {
      missingCount++;
    } else {
      if (!groups[g]) groups[g] = [];
      groups[g].push(v);
    }
  }

  const keys = Object.keys(groups);
  if (keys.length !== 2) {
    throw new Error(`Independent T-Test membutuhkan tepat 2 kelompok. Ditemukan: ${keys.length} kelompok.`);
  }

  const group1 = groups[keys[0]];
  const group2 = groups[keys[1]];

  if (group1.length < 2 || group2.length < 2) throw new Error("Data per kelompok tidak cukup.");

  const m1 = ss.mean(group1);
  const m2 = ss.mean(group2);
  const v1 = ss.variance(group1);
  const v2 = ss.variance(group2);
  const n1 = group1.length;
  const n2 = group2.length;

  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const t = (m1 - m2) / (sp * Math.sqrt(1/n1 + 1/n2));
  const df = n1 + n2 - 2;
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));

  const chartData = [
    { name: keys[0], value: m1 },
    { name: keys[1], value: m2 }
  ];

  return {
    title: `Independent T-Test: ${varNumeric} by ${varGroup}`,
    type: 'table' as const,
    missingCount,
    chartType: 'bar' as const,
    chartData,
    chartLabels: { x: varGroup, y: `Rata-rata ${varNumeric}` },
    content: {
      columns: ['Kelompok 1', 'Kelompok 2', 'Mean 1', 'Mean 2', 't', 'df', 'p-value'],
      data: [{
        'Kelompok 1': keys[0],
        'Kelompok 2': keys[1],
        'Mean 1': m1,
        'Mean 2': m2,
        t,
        df,
        'p-value': pValue
      }]
    }
  };
}

export function runANOVA(dataset: any[], varNumeric: string, varGroup: string) {
  let missingCount = 0;
  const groups: Record<string, number[]> = {};
  
  for (const row of dataset) {
    const vVal = row[varNumeric];
    const gVal = row[varGroup];
    
    const v = Number(vVal);
    const g = gVal != null ? String(gVal).trim() : '';
    
    if (isNaN(v) || vVal === '' || vVal == null || g === '' || g === 'undefined' || g === 'null') {
      missingCount++;
    } else {
      if (!groups[g]) groups[g] = [];
      groups[g].push(v);
    }
  }

  const keys = Object.keys(groups);
  if (keys.length < 2) {
    throw new Error(`ANOVA membutuhkan setidaknya 2 kelompok.`);
  }

  const arrays = keys.map(k => groups[k]);
  const pValue = jStat.anovaftest(...arrays);
  
  // Hitung F stat manual untuk menampilkannya
  const totalData: number[] = [];
  arrays.forEach(arr => totalData.push(...arr));
  const grandMean = ss.mean(totalData);
  const N = totalData.length;
  const k = arrays.length;
  
  let ssw = 0; // sum of squares within
  let ssb = 0; // sum of squares between
  
  arrays.forEach(arr => {
    const m = ss.mean(arr);
    ssb += arr.length * Math.pow(m - grandMean, 2);
    arr.forEach(val => {
      ssw += Math.pow(val - m, 2);
    });
  });
  
  const dfb = k - 1;
  const dfw = N - k;
  const msb = ssb / dfb;
  const msw = ssw / dfw;
  const F = msb / msw;

  const chartData = keys.map(groupKey => ({
    name: groupKey,
    value: ss.mean(groups[groupKey])
  }));

  return {
    title: `One-Way ANOVA: ${varNumeric} by ${varGroup}`,
    type: 'table' as const,
    missingCount,
    chartType: 'bar' as const,
    chartData,
    chartLabels: { x: varGroup, y: `Rata-rata ${varNumeric}` },
    content: {
      columns: ['Source', 'SS', 'df', 'MS', 'F', 'p-value'],
      data: [
        { Source: 'Between Groups', SS: ssb, df: dfb, MS: msb, F: F, 'p-value': pValue },
        { Source: 'Within Groups', SS: ssw, df: dfw, MS: msw, F: null, 'p-value': null },
        { Source: 'Total', SS: ssb + ssw, df: N - 1, MS: null, F: null, 'p-value': null }
      ]
    }
  };
}

export function runLinearRegression(dataset: any[], varY: string, varX: string) {
  const data: [number, number][] = [];
  let missingCount = 0;
  
  for (const row of dataset) {
    const xVal = row[varX];
    const yVal = row[varY];
    const x = Number(xVal);
    const y = Number(yVal);
    
    if (isNaN(x) || xVal === '' || xVal == null || isNaN(y) || yVal === '' || yVal == null) {
      missingCount++;
    } else {
      data.push([x, y]);
    }
  }

  if (data.length < 2) throw new Error("Data tidak cukup.");

  const result = ss.linearRegression(data);
  const r2 = ss.rSquared(data, ss.linearRegressionLine(result));
  
  // Hitung p-value koefisien b
  const r = Math.sqrt(r2); // simple correlation
  const n = data.length;
  const t = r * Math.sqrt((n - 2) / (1 - r2));
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - 2));

  // Compute regression line
  const regressionLine = ss.linearRegressionLine(result);
  const sortedData = [...data].sort((a, b) => a[0] - b[0]);
  const chartData = sortedData.map(([x, y]) => ({
    x,
    y,
    lineY: regressionLine(x)
  }));

  return {
    title: `Regresi Linier Sederhana: ${varY} ~ ${varX}`,
    type: 'table' as const,
    missingCount,
    chartType: 'regression' as const,
    chartData,
    chartLabels: { x: varX, y: varY },
    content: {
      columns: ['Variabel', 'Koefisien', 'R-Squared', 't', 'p-value', 'n'],
      data: [
        { Variabel: 'Intercept', Koefisien: result.b, 'R-Squared': null, t: null, 'p-value': null, n },
        { Variabel: varX, Koefisien: result.m, 'R-Squared': r2, t, 'p-value': pValue, n }
      ]
    }
  };
}

export function runReliability(dataset: any[], variables: string[]) {
  if (variables.length < 2) throw new Error("Cronbach Alpha butuh setidaknya 2 variabel.");
  
  let missingCount = 0;
  const validRows = dataset.filter(row => {
    const isValid = variables.every(v => {
      const val = row[v];
      return !isNaN(Number(val)) && val !== '' && val != null;
    });
    if (!isValid) {
      missingCount++;
    }
    return isValid;
  });

  if (validRows.length < 2) throw new Error("Data valid tidak cukup.");

  let sumOfVariances = 0;
  for (const v of variables) {
    const col = validRows.map(r => Number(r[v]));
    sumOfVariances += ss.variance(col);
  }

  const totalScores = validRows.map(r => {
    return variables.reduce((sum, v) => sum + Number(r[v]), 0);
  });
  
  const varianceOfTotal = ss.variance(totalScores);
  const k = variables.length;

  let alpha = 0;
  if (varianceOfTotal > 0) {
    alpha = (k / (k - 1)) * (1 - (sumOfVariances / varianceOfTotal));
  }

  return {
    title: `Uji Reliabilitas (Cronbach Alpha)`,
    type: 'table' as const,
    missingCount,
    content: {
      columns: ['N Items', 'N Kasus', 'Cronbach Alpha'],
      data: [{
        'N Items': k,
        'N Kasus': validRows.length,
        'Cronbach Alpha': alpha
      }]
    }
  };
}
