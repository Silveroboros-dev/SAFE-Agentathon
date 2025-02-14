import { ethers } from 'ethers'
import OpenAI from 'openai'
import axios from 'axios'
import { NewsItem, NewsAnalysis } from './types'
import { promptManager } from './prompts'

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
        try {
            const completion = await this.openai.chat.completions.create({
                ...promptManager.getParameters('news'),
                messages: [
                    {
                        role: "system",
                        content: promptManager.getSystemPrompt('news')
                    },
                    {
                        role: "user",
                        content: JSON.stringify(news)
                    }
                ]
            })

            const analysis = JSON.parse(completion.choices[0].message.content)
            return {
                ...analysis,
                timestamp: Math.floor(Date.now() / 1000),
                exists: true
            }
        } catch (error) {
            console.error('Failed to analyze news:', error)
            throw error
        }
    }
}
