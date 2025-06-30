
export async function collectNewsSentiment(supabaseClient: any, symbol: string, finnhubKey: string) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const weekAgoStr = lastWeek.toISOString().split('T')[0];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const newsResponse = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${weekAgoStr}&to=${today}&token=${finnhubKey}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (newsResponse.ok) {
      const newsData = await newsResponse.json();
      
      if (Array.isArray(newsData) && newsData.length > 0) {
        // Process only top 3 articles for efficiency
        for (const article of newsData.slice(0, 3)) {
          const sentimentScore = analyzeSentiment(article.headline + ' ' + (article.summary || ''));
          
          await supabaseClient
            .from('news_sentiment')
            .upsert({
              symbol,
              headline: article.headline,
              summary: article.summary || '',
              url: article.url,
              sentiment_score: sentimentScore,
              published_at: new Date(article.datetime * 1000).toISOString(),
              source: article.source,
              category: article.category || 'general',
              date: today
            }, { onConflict: 'symbol,headline,date' });
        }
        
        console.log(`✓ Updated news sentiment for ${symbol}`);
      }
    }
  } catch (newsError) {
    console.error(`Error fetching news for ${symbol}:`, newsError);
  }
}

function analyzeSentiment(text: string): number {
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'strong', 'growth', 'profit', 'gain', 'success', 'bullish', 'buy', 'upgrade', 'outperform', 'beat', 'exceed'];
  const negativeWords = ['bad', 'poor', 'negative', 'weak', 'loss', 'decline', 'fail', 'bearish', 'sell', 'downgrade', 'underperform', 'risk', 'miss', 'below'];
  
  const words = text.toLowerCase().split(/\W+/);
  let score = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) score += 1;
    if (negativeWords.includes(word)) score -= 1;
  });
  
  const maxWords = Math.max(positiveWords.length, negativeWords.length);
  return Math.max(-1, Math.min(1, score / maxWords));
}
