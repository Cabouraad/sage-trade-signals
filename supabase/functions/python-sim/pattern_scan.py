
"""
Pattern scanning using CNN model for chart pattern recognition
"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from io import BytesIO
import base64
from datetime import datetime, date
import os
import json
from typing import Dict, List, Any

# Mock TensorFlow model for demonstration
class MockCNNModel:
    """Mock CNN model that simulates pattern recognition"""
    
    def __init__(self):
        self.patterns = [
            'inverse_head_and_shoulders',
            'cup_and_handle',
            'ascending_triangle',
            'bull_flag',
            'double_bottom',
            'falling_wedge'
        ]
    
    def predict(self, image_array: np.ndarray) -> Dict[str, float]:
        """Mock prediction that returns random but realistic confidences"""
        # Simulate model prediction based on price action characteristics
        np.random.seed(int(image_array.sum()) % 1000)  # Deterministic but varied
        
        # Generate confidence scores
        confidences = {}
        for pattern in self.patterns:
            base_confidence = np.random.uniform(0.1, 0.9)
            # Add some bias for more bullish patterns in uptrending data
            if pattern in ['inverse_head_and_shoulders', 'cup_and_handle', 'ascending_triangle']:
                base_confidence += 0.1
            confidences[pattern] = min(0.95, base_confidence)
        
        return confidences

def load_model() -> MockCNNModel:
    """Load the pre-trained CNN model"""
    # In production, this would load the actual TensorFlow model
    # return tf.keras.models.load_model('models/chart_cnn.h5')
    return MockCNNModel()

def generate_chart_image(price_data: pd.DataFrame, symbol: str) -> np.ndarray:
    """
    Generate 100x100 OHLC chart image from price data
    
    Args:
        price_data: DataFrame with OHLC data
        symbol: Stock symbol
    
    Returns:
        100x100 numpy array representing the chart image
    """
    fig, ax = plt.subplots(figsize=(2, 2), dpi=50)  # 100x100 pixels
    fig.patch.set_facecolor('black')
    ax.set_facecolor('black')
    
    # Get last 90 candles
    data = price_data.tail(90).copy()
    
    if len(data) < 30:  # Need minimum data
        return np.zeros((100, 100, 3))
    
    # Normalize data to fit in chart
    price_min = data[['low', 'open', 'high', 'close']].min().min()
    price_max = data[['low', 'open', 'high', 'close']].max().max()
    price_range = price_max - price_min
    
    if price_range == 0:
        return np.zeros((100, 100, 3))
    
    # Plot candlesticks
    for i, (idx, row) in enumerate(data.iterrows()):
        x = i
        open_price = (row['open'] - price_min) / price_range
        high_price = (row['high'] - price_min) / price_range
        low_price = (row['low'] - price_min) / price_range
        close_price = (row['close'] - price_min) / price_range
        
        # Color based on candle direction
        color = 'green' if close_price >= open_price else 'red'
        
        # Draw high-low line
        ax.plot([x, x], [low_price, high_price], color='white', linewidth=0.5)
        
        # Draw candle body
        body_height = abs(close_price - open_price)
        body_bottom = min(open_price, close_price)
        
        rect = patches.Rectangle((x-0.3, body_bottom), 0.6, body_height, 
                               linewidth=0.5, edgecolor='white', facecolor=color)
        ax.add_patch(rect)
    
    # Style the chart
    ax.set_xlim(-1, len(data))
    ax.set_ylim(0, 1)
    ax.axis('off')
    plt.tight_layout()
    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    
    # Convert to numpy array
    buf = BytesIO()
    plt.savefig(buf, format='png', facecolor='black', edgecolor='none', 
                bbox_inches='tight', pad_inches=0, dpi=50)
    buf.seek(0)
    
    # Convert to RGB array
    from PIL import Image
    img = Image.open(buf)
    img_array = np.array(img)
    
    plt.close(fig)
    
    # Ensure it's 100x100x3
    if img_array.shape[:2] != (100, 100):
        img = img.resize((100, 100))
        img_array = np.array(img)
    
    if len(img_array.shape) == 2:  # Grayscale
        img_array = np.stack([img_array] * 3, axis=-1)
    elif img_array.shape[2] == 4:  # RGBA
        img_array = img_array[:, :, :3]
    
    return img_array

async def scan_patterns(symbols: List[str], supabase_client) -> Dict[str, Any]:
    """
    Scan for chart patterns across given symbols
    
    Args:
        symbols: List of stock symbols to scan
        supabase_client: Supabase client for database operations
    
    Returns:
        Dictionary with scan results
    """
    model = load_model()
    results = {
        'scanned_symbols': [],
        'patterns_found': [],
        'high_confidence_patterns': []
    }
    
    today = date.today().isoformat()
    
    for symbol in symbols:
        try:
            # Fetch price data
            response = await supabase_client.from('price_history')\
                .select('*')\
                .eq('symbol', symbol)\
                .order('date', desc=True)\
                .limit(90)\
                .execute()
            
            if not response.data or len(response.data) < 30:
                continue
            
            # Convert to DataFrame
            price_df = pd.DataFrame(response.data)
            price_df['date'] = pd.to_datetime(price_df['date'])
            price_df = price_df.sort_values('date')
            
            # Generate chart image
            chart_image = generate_chart_image(price_df, symbol)
            
            # Get model predictions
            predictions = model.predict(chart_image)
            
            # Process predictions
            for pattern, confidence in predictions.items():
                if confidence >= 0.70:  # High confidence threshold
                    # Store in database
                    await supabase_client.from('pattern_signal').upsert({
                        'symbol': symbol,
                        'scan_date': today,
                        'pattern': pattern,
                        'confidence': confidence
                    }, on_conflict='symbol,scan_date,pattern').execute()
                    
                    results['high_confidence_patterns'].append({
                        'symbol': symbol,
                        'pattern': pattern,
                        'confidence': confidence
                    })
                
                results['patterns_found'].append({
                    'symbol': symbol,
                    'pattern': pattern,
                    'confidence': confidence
                })
            
            results['scanned_symbols'].append(symbol)
            
        except Exception as e:
            print(f"Error scanning {symbol}: {e}")
            continue
    
    return results

# FastAPI endpoint would be defined in the main container
async def pattern_scan_endpoint(symbols: List[str], supabase_client):
    """Pattern scanning endpoint for the FastAPI container"""
    return await scan_patterns(symbols, supabase_client)
