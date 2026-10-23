
import spacy

nlp = spacy.load("en_core_web_sm")

text = "The office lights were flickering badly."

doc = nlp(text)

for chunk in doc.noun_chunks:
    print(chunk.text)
