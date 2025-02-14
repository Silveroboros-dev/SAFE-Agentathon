import { ethers } from 'ethers'
import OpenAI from 'openai'
import axios from 'axios'
import { NewsItem, NewsAnalysis } from './types'

export class NewsFeedOracle {
    private openai: OpenAI
    private contract: ethers.Contract
    private signer: ethers.Signer

    constructor(
        contractAddress: string,
        contractABI: ethers.ContractInterface,
        signer: ethers.Signer,
        openaiApiKey: string
    ) {
        this.openai = new OpenAI({
            apiKey: openaiApiKey
        })
        this.contract = new ethers.Contract(contractAddress, contractABI, signer)
        this.signer = signer
    }

    async updateNewsAnalysis(
        counterpartyAddress: string,
        counterpartyName: string,
        sector?: string
    ): Promise<ethers.ContractTransaction> {
        try {
            // Fetch and analyze news
            const news = await this.fetchNews(counterpartyName, sector)
            const analysis = await this.analyzeNews(news)
            
            // Request oracle update
            return await this.contract.requestNewsAnalysis(
                counterpartyAddress,
                counterpartyName
            )
        } catch (error) {
            console.error('Failed to update news analysis:', error)
            throw error
        }
    }

    async getNewsAnalysis(counterpartyAddress: string): Promise<NewsAnalysis> {
        try {
            const analysis = await this.contract.getNewsAnalysis(counterpartyAddress)
            return {
                sentiment: analysis.sentiment,
                riskLevel: analysis.riskLevel,
                keyInsights: analysis.keyInsights,
                timestamp: analysis.timestamp.toNumber(),
                exists: analysis.exists
            }
        } catch (error) {
            console.error('Failed to get news analysis:', error)
            throw error
        }
    }

    private async fetchNews(
        counterpartyName: string,
        sector?: string,
        daysBack: number = 7
    ): Promise<NewsItem[]> {
        const fromDate = new Date()
        fromDate.setDate(fromDate.getDate() - daysBack)
        
        const query = `${counterpartyName} ${sector || ''}`.trim()
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: query,
                from: fromDate.toISOString().split('T')[0],
                sortBy: 'relevancy',
                language: 'en',
                apiKey: process.env.NEWS_API_KEY
            }
        })

        return response.data.articles.map((article: any) => ({
            title: article.title,
            description: article.description,
            source: article.source.name,
            publishedAt: article.publishedAt,
            url: article.url
        }))
    }

    private async analyzeNews(news: NewsItem[]): Promise<NewsAnalysis> {
        if (news.length === 0) {
            return {
                sentiment: 'neutral',
                riskLevel: 'low',
                keyInsights: ['No recent news available'],
                timestamp: Math.floor(Date.now() / 1000),
                exists: true
            }
        }

        const newsContent = news.map(item => 
            `${item.title}\n${item.description || ''}`
        ).join('\n\n')

        const completion = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: `Analyze the following news articles for counterparty risk assessment. 
                    Focus on financial health, market position, regulatory issues, and business stability. 
                    Provide analysis in JSON format with the following structure:
                    {
                        "sentiment": "positive|negative|neutral",
                        "riskLevel": "low|medium|high",
                        "keyInsights": ["insight1", "insight2", ...]
                    }`
                },
                {
                    role: "user",
                    content: newsContent
                }
            ],
            response_format: { type: "json_object" }
        })

        const analysis = JSON.parse(completion.choices[0].message.content)
        return {
            ...analysis,
            timestamp: Math.floor(Date.now() / 1000),
            exists: true
        }
    }
}
