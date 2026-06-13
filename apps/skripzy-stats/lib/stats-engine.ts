import * as ss from 'simple-statistics';
import jStat from 'jstat';

// Extract numeric values from a dataset column
export function getNumericColumn(dataset: any[], colName: string): number[] {
  return dataset
    .map(row => Number(row[colName]))
    .filter(val => !isNaN(val));
}

export function runDescriptives(dataset: any[], variables: string[]) {
  const results = variables.map(v => {
    const data = getNumericColumn(dataset, v);
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
    content: {
      columns: ['Variabel', 'N', 'Rata_rata', 'SD', 'Varians', 'Skewness', 'Kurtosis', 'Min', 'Max'],
      data: results
    }
  };
}

export function runPearsonCorrelation(dataset: any[], varX: string, varY: string) {
  const dataX = [];
  const dataY = [];
  
  for (let i = 0; i < dataset.length; i++) {
    const x = Number(dataset[i][varX]);
    const y = Number(dataset[i][varY]);
    if (!isNaN(x) && !isNaN(y)) {
      dataX.push(x);
      dataY.push(y);
    }
  }

  if (dataX.length < 2) {
    throw new Error("Data tidak cukup untuk korelasi");
  }

  const r = ss.sampleCorrelation(dataX, dataY);
  
  // Calculate t-statistic for p-value
  const n = dataX.length;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const pValue = jStat.studentt.pdf(t, n - 2) * 2; // two-tailed

  return {
    title: `Korelasi Pearson: ${varX} & ${varY}`,
    type: 'table' as const,
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

// Additional tests like T-Test, ANOVA can be implemented similarly using jStat and simple-statistics.
