import { BaseTool } from '../core/BaseTool';
import { WeatherResponse } from '../types';
import { Logger } from '../utils/Logger';
import axios from 'axios';

/**
 * Weather API Tool - Provides current weather information for a location
 * Integrates with WeatherAPI.com (free tier)
 */
export class WeatherAPITool extends BaseTool {
  readonly name = 'get-weather';
  readonly description = 'Get current weather information for a specified location';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      location: {
        type: 'string',
        description: 'City name (e.g., "London", "New York") or city with country code (e.g., "London,UK")'
      }
    },
    required: ['location']
  };

  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    super();
  
    // Get API key from environment variable
    this.apiKey = process.env.WEATHER_API_KEY || '';
    this.apiUrl = process.env.WEATHER_API_URL || 'http://api.weatherapi.com/v1/current.json';

    if (!this.apiKey) {
      Logger.warning('WEATHER_API_KEY not set in environment variables. Weather API calls will fail.');
    }
  }

  /**
   * Execute the weather query
   * @param params - Parameters containing location
   * @returns Promise resolving to WeatherResponse
   */
  async execute(params: { location: string }): Promise<WeatherResponse> {
    // Implement parameter validation before making external requests
    if (!this.validate(params)) {
      const error = new Error('Invalid parameters: location is required and must be a string');
      Logger.error('Weather API parameter validation failed', error, { params });
      throw error;
    }

    const { location } = params;

    // Validate API key is available
    if (!this.apiKey) {
      const error = new Error('Weather API key not configured. Please set WEATHER_API_KEY environment variable.');
      Logger.error('Weather API key missing', error);
      throw error;
    }

    // Add logging for weather API requests
    Logger.info('Weather API request initiated', { location }); 

    try {
      // Make HTTP request to weather API
      const response = await axios.get(this.apiUrl, {
        params: {
          q: location,
          key: this.apiKey ,
          aqi:"no"
        },
        timeout: 10000 // 10 second timeout
      });

      // Transform external API response to WeatherResponse interface format
      const weatherData = this.transformResponse(response.data, location);

      // Add logging for successful responses
      Logger.info('Weather API request successful', { 
        location: weatherData.location,
        temperature: weatherData.temperature,
        conditions: weatherData.conditions
      });

      return weatherData;

    } catch (error) {
      // Add error handling for API failures with meaningful error messages
      if (axios.isAxiosError(error)) {
        let errorMessage = 'Weather API request failed';
        
        if (error.response) {
          // API responded with error status
          const status = error.response.status;
          
          if (status === 401) {
            errorMessage = 'Invalid API key. Please check WEATHER_API_KEY configuration.';
          } else if (status === 404) {
            errorMessage = `Location "${location}" not found. Please check the location name and try again.`;
          } else if (status === 429) {
            errorMessage = 'API rate limit exceeded. Please try again later.';
          } else {
            errorMessage = `Weather API error: ${error.response.statusText}`;
          }
        } else if (error.request) {
          // Request made but no response received
          errorMessage = 'Weather API request timeout or network error. Please check your connection.';
        } else {
          // Error setting up the request
          errorMessage = `Weather API request error: ${error.message}`;
        }

        Logger.error(errorMessage, error, { location, status: error.response?.status });
        throw new Error(errorMessage);
      }

      // Handle non-Axios errors
      const err = error as Error;
      Logger.error('Unexpected error during weather API request', err, { location });
      throw new Error(`Unexpected error: ${err.message}`);
    }
  }

  /**
   * Transform WeatherAPI.com response to WeatherResponse format
   * @param data - Raw API response data
   * @param requestedLocation - Original location string from request
   * @returns Formatted WeatherResponse
   */
  private transformResponse(data: any, requestedLocation: string): WeatherResponse {
    return {
      location: data.location?.name || requestedLocation,
      temperature: Math.round(data.current.temp_c * 10) / 10, // Round to 1 decimal place
      temperatureUnit: 'celsius',
      conditions: data.current?.condition?.text || 'Unknown',
      humidity: data.current?.humidity,
      windSpeed: data.current?.wind_kph,
      timestamp: new Date().toISOString()
    };
  }
}
