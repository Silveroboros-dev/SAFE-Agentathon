import OpenAI from 'openai';
import axios from 'axios';

export interface NewsItem {
    title: string;
    description: string;
    source: string;
    publishedAt: string;
    url: string;
}

export interface NewsAnalysis {
    sentiment: 'positive' | 'negative' | 'neutral';
    riskLevel: 'low' | 'medium' | 'high';
    keyInsights: string[];
}

export class NewsFeedService {
    private openai: OpenAI;
    private newsApiKey: string;

    constructor(openaiApiKey: string, newsApiKey: string) {
        this.openai = new OpenAI({
            apiKey: openaiApiKey
        });
        this.newsApiKey = newsApiKey;
    }

    async getCounterpartyNews(
        counterpartyName: string,
        sector?: string,
        daysBack: number = 7
    ): Promise<NewsItem[]> {
        try {
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - daysBack);
            
            const query = `${counterpartyName} ${sector || ''}`.trim();
            const response = await axios.get('https://newsapi.org/v2/everything', {
                params: {
                    q: query,
                    from: fromDate.toISOString().split('T')[0],
                    sortBy: 'relevancy',
                    language: 'en',
                    apiKey: this.newsApiKey
                }
            });

            return response.data.articles.map((article: any) => ({
                title: article.title,
                description: article.description,
                source: article.source.name,
                publishedAt: article.publishedAt,
                url: article.url
            }));
        } catch (error) {
            console.error('Failed to fetch news:', error);
            return [];
        }
    }

    async analyzeNews(news: NewsItem[]): Promise<NewsAnalysis> {
        if (news.length === 0) {
            return {
                sentiment: 'neutral',
                riskLevel: 'low',
                keyInsights: ['No recent news available']
            };
        }

        const newsContent = news.map(item => 
            `${item.title}\n${item.description || ''}`
        ).join('\n\n');

        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [
                    {
                        role: "system",
                        content: `Analyze the following news articles for counterparty risk assessment. 
                        Focus on financial health, market position, regulatory issues, and business stability. 
                        Provide analysis in JSON format.`
                    },
                    {
                        role: "user",
                        content: newsContent
                    }
                ],
                response_format: { type: "json_object" }
            });

            const analysis = JSON.parse(completion.choices[0].message.content);
            return {
                sentiment: analysis.sentiment,
                riskLevel: analysis.riskLevel,
                keyInsights: analysis.keyInsights
            };
        } catch (error) {
            console.error('News analysis failed:', error);
            return {
                sentiment: 'neutral',
                riskLevel: 'low',
                keyInsights: ['Failed to analyze news']
            };
        }
    }
}
