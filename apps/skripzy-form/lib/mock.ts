import { FormResponse, FormTemplate } from './types';

export function generateMockResponses(template: FormTemplate, numResponses: number = 30): FormResponse[] {
  const responses: FormResponse[] = [];
  
  for (let i = 0; i < numResponses; i++) {
    const answers: Record<string, any> = {};
    const baseSentiment = Math.random(); 
    
    template.sections.forEach(section => {
      const variableBias = (Math.random() - 0.5) * 0.4;
      
      section.items.forEach(item => {
        if (item.type === 'likert') {
          const itemNoise = (Math.random() - 0.5) * 0.4;
          let scoreRaw = baseSentiment + variableBias + itemNoise;
          let scale = item.scale || 5;
          let score = Math.round((scoreRaw * (scale - 1)) + 1);
          if (score < 1) score = 1;
          if (score > scale) score = scale;
          answers[item.id] = score;
        } else if (item.type === 'text') {
          answers[item.id] = `Sample Answer ${Math.floor(Math.random() * 1000)}`;
        } else if (item.type === 'choice' && item.options && item.options.length > 0) {
          answers[item.id] = item.options[Math.floor(Math.random() * item.options.length)];
        } else if (item.type === 'checkbox' && item.options && item.options.length > 0) {
          const count = Math.floor(Math.random() * item.options.length) + 1;
          const shuffled = [...item.options].sort(() => 0.5 - Math.random());
          answers[item.id] = shuffled.slice(0, count);
        }
      });
    });
    
    responses.push({
      id: `resp_${i + 1}`,
      timestamp: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
      answers
    });
  }
  
  return responses;
}
