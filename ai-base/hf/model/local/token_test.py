from transformers import BertTokenizer

model_name = "google-bert/bert-base-chinese"
token = BertTokenizer.from_pretrained(model_name)

# print(token)


vocab = token.get_vocab()
print("len(vocab):", len(vocab))
# print(vocab)

ge = "歌"
qu = '曲'
gequ = ge + qu

print(ge in vocab, vocab.get(ge))
print(qu in vocab, vocab.get(qu))
print(gequ in vocab, vocab.get(gequ))

# 添加新词
token.add_tokens([gequ])

# 添加新的特殊符号
token.add_special_tokens({"eos_token": "[EOS]"})

print("len(vocab):", len(vocab))
print(gequ in vocab, vocab.get(gequ))
# print(token)
# print(token.eos_token, token.eos_token_id, token.convert_tokens_to_ids(token.eos_token))


out = token.encode(text="歌曲丰富生活[EOS]", 
                   text_pair=None, 
                   add_special_tokens=True, 
                   padding="max_length", 
                   max_length=10, 
                   truncation=True, 
                   return_tensors=None,)
print(out)

# 解码为原字符串
print(token.decode(out))