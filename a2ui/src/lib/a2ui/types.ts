export type A2uiAnswerCard = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  protocol: "a2ui";
};

export type A2uiAnswerPayload = {
  topic: string;
  cards: A2uiAnswerCard[];
  followUp: string;
  agent: "agui-learning-agent";
};
