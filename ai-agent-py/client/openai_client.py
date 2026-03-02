import os
from openai import OpenAI
from dotenv import load_dotenv
from typing import Dict

load_dotenv()  # 加载环境变量

class OpenAICompatibleClient:
    """
    一个用于调用任何兼容OpenAI接口的LLM服务的客户端。
    """
    def __init__(self, model: str=os.getenv("OPENAI_MODEL"), api_key: str=os.getenv("OPENAI_API_KEY"), base_url: str=os.getenv("OPENAI_BASE_URL")   ):
        self.model = model
        self.client = OpenAI(api_key=api_key, base_url=base_url)

    def generate(self, prompt: str, system_prompt: str) -> str:
        """调用LLM API来生成回应。"""
        print("正在调用大语言模型...")
        try:
            messages = [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': prompt}
            ]
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=False
            )
            answer = response.choices[0].message.content
            print("大语言模型响应成功。")
            return answer
        except Exception as e:
            print(f"调用LLM API时发生错误: {e}")
            return "错误:调用语言模型服务时出错。"

    def think(self, messages: list[Dict[str, str]], temperature: float = 0) -> str:
        """
        调用大语言模型进行思考，并返回其响应。
        """
        print(f"🧠 正在调用 {self.model} 模型...")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                stream=True
            )

             # 处理流式响应
            print("✅ 大语言模型响应成功:")
            collected_content = []
            for chunk in response:
                content = chunk.choices[0].delta.content or ""
                print(content, end="", flush=True)
                collected_content.append(content)
            print()  # 在流式输出结束后换行
            return "".join(collected_content)

        except Exception as e:
            print(f"❌ 调用LLM API时发生错误: {e}")
            return None

# --- 客户端使用示例 ---
if __name__ == '__main__':
    try:
        llmClient = OpenAICompatibleClient(
        #     model=os.getenv("OPENAI_MODEL"),
        #     api_key=os.getenv("OPENAI_API_KEY"),
        #     base_url=os.getenv("OPENAI_BASE_URL")
        )
        
        exampleMessages = [
            {"role": "system", "content": "You are a helpful assistant that writes Python code."},
            # {"role": "user", "content": "写一个快速排序算法"}
            {"role": "user", "content": "你好"}
        ]
        
        print("--- 调用LLM ---")
        # responseText = llmClient.think(exampleMessages)
        responseText = llmClient.generate(exampleMessages[1]['content'], system_prompt=exampleMessages[0]['content'])
        if responseText:
            print("\n\n--- 完整模型响应 ---")
            print(responseText)

    except ValueError as e:
        print(e)
