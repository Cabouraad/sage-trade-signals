
export interface AnalysisResult {
  success: boolean;
  message: string;
  result?: any;
}

export async function runAnalysis(supabaseClient: any, symbols: string[], successfulUpdates: number): Promise<AnalysisResult> {
  if (successfulUpdates < 3) {
    console.warn(`Insufficient fresh data (${successfulUpdates}/${symbols.length}) - skipping analysis`);
    return { 
      success: false, 
      message: `Insufficient fresh data (${successfulUpdates}/${symbols.length}) - skipping analysis` 
    };
  }

  try {
    console.log('Running real data analysis with sufficient data...');
    
    const { data: rankResult, error: rankError } = await supabaseClient.functions.invoke('python-sim', {
      body: { 
        symbols: symbols.slice(0, successfulUpdates),
        path: 'rank'
      }
    });

    if (rankError) {
      console.error('Error in real data analysis:', rankError);
      return { success: false, message: 'Error in real data analysis', result: rankError };
    }
    
    if (rankResult?.success) {
      console.log('✓ Real data analysis completed successfully:', rankResult);
      return { success: true, message: 'Real data analysis completed successfully', result: rankResult };
    } else {
      console.warn('Analysis completed but no suitable candidates found:', rankResult);
      return { success: false, message: 'Analysis completed but no suitable candidates found', result: rankResult };
    }
  } catch (error) {
    console.error('Error calling analysis function:', error);
    return { success: false, message: 'Error calling analysis function', result: error };
  }
}
