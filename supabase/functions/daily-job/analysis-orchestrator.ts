
export async function runOptionsAnalysis(supabaseClient: any, symbols: string[]) {
  console.log('Running options scanner on liquid symbols...');
  const { data: optionsResult, error: optionsError } = await supabaseClient.functions.invoke('options-scanner', {
    body: { symbols }
  });

  if (optionsError) {
    console.error('Error calling options-scanner:', optionsError);
    return null;
  } else {
    console.log('Options analysis result:', optionsResult);
    return optionsResult;
  }
}

export async function runStockRanking(supabaseClient: any) {
  // Check if we have any recent options strategies
  const { data: existingStrategies } = await supabaseClient
    .from('options_strategies')
    .select('id')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (!existingStrategies || existingStrategies.length === 0) {
    console.log('No options strategies found, running stock ranking as fallback...');
    const { data: rankingResult, error: rankingError } = await supabaseClient.functions.invoke('rank-runner');
    
    if (rankingError) {
      console.error('Error calling rank-runner:', rankingError);
      return null;
    } else {
      console.log('Stock ranking result:', rankingResult);
      return rankingResult;
    }
  } else {
    console.log('Options strategies found, skipping stock ranking');
    return null;
  }
}
