
export interface AnalysisResult {
  success: boolean;
  message: string;
  result?: any;
}

export async function runAnalysis(supabaseClient: any, symbols: string[], successfulUpdates: number): Promise<AnalysisResult> {
  // Reduce threshold - run analysis if we have ANY data
  if (successfulUpdates === 0) {
    // Check if we have any existing data to work with
    const { data: existingData } = await supabaseClient
      .from('price_history')
      .select('symbol')
      .in('symbol', symbols)
      .limit(1);
    
    if (!existingData || existingData.length === 0) {
      console.warn('No price data available at all - skipping analysis');
      return { 
        success: false, 
        message: 'No price data available - skipping analysis' 
      };
    }
    
    console.log('No fresh updates but found existing data - proceeding with analysis');
  } else {
    console.log(`Running analysis with ${successfulUpdates} fresh updates...`);
  }

  try {
    console.log('Calling python-sim analysis function...');
    
    const { data: rankResult, error: rankError } = await supabaseClient.functions.invoke('python-sim', {
      body: { 
        symbols: symbols,
        path: 'rank',
        force_analysis: true
      }
    });

    if (rankError) {
      console.error('Error in analysis:', rankError);
      return { success: false, message: 'Error in analysis', result: rankError };
    }
    
    console.log('Analysis result:', rankResult);
    
    if (rankResult?.success) {
      console.log('✓ Analysis completed successfully:', rankResult);
      return { success: true, message: 'Analysis completed successfully', result: rankResult };
    } else {
      console.warn('Analysis completed but no suitable candidates found:', rankResult);
      return { success: false, message: 'Analysis completed but no suitable candidates found', result: rankResult };
    }
  } catch (error) {
    console.error('Error calling analysis function:', error);
    return { success: false, message: 'Error calling analysis function', result: error };
  }
}
