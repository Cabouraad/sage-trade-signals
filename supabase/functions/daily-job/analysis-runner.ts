
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
      console.error('Error in analysis function call:', rankError);
      return { success: false, message: 'Error calling analysis function', result: rankError };
    }
    
    console.log('Analysis function response:', rankResult);
    
    if (rankResult?.success) {
      console.log('✓ Analysis completed successfully');
      return { success: true, message: 'Analysis completed successfully', result: rankResult };
    } else {
      console.warn('Analysis completed but returned success=false:', rankResult);
      return { success: false, message: rankResult?.message || 'Analysis completed but no suitable candidates found', result: rankResult };
    }
  } catch (error) {
    console.error('Exception in analysis function call:', error);
    return { success: false, message: 'Exception in analysis function call', result: { error: error.message, stack: error.stack } };
  }
}
