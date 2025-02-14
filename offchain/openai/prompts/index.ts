import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'

interface PromptConfig {
    name: string
    version: string
    description: string
    system_prompt: string
    parameters: {
        model: string
        response_format?: {
            type: string
        }
        temperature?: number
    }
}

export class PromptManager {
    private promptsDir: string

    constructor() {
        this.promptsDir = path.join(__dirname)
    }

    public loadPrompt(agentType: string): PromptConfig {
        const promptPath = path.join(this.promptsDir, `${agentType}.yaml`)
        try {
            const promptFile = fs.readFileSync(promptPath, 'utf8')
            return yaml.load(promptFile) as PromptConfig
        } catch (error) {
            throw new Error(`Failed to load prompt for ${agentType}: ${error}`)
        }
    }

    public getSystemPrompt(agentType: string): string {
        const config = this.loadPrompt(agentType)
        return config.system_prompt.trim()
    }

    public getParameters(agentType: string): any {
        const config = this.loadPrompt(agentType)
        return config.parameters
    }
}

export const promptManager = new PromptManager();
