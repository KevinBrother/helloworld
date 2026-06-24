from transformers import BertTokenizer, BertForSequenceClassification
from transformers import pipeline

# 加载模型和分词器
model_name = "google-bert/bert-base-chinese"
model = BertForSequenceClassification.from_pretrained(model_name)
tokenizer = BertTokenizer.from_pretrained(model_name)

# 创建分类 pipeline
classifier = pipeline("text-classification", model=model, tokenizer=tokenizer)

# 进行分类
result = classifier("你好，我是一款语言模型")
print(result)
