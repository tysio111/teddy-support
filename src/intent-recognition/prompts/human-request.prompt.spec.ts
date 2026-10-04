import { matchesHumanRequest } from './human-request.prompt';

describe('matchesHumanRequest', () => {
  it.each([
    'I want to talk to a human',
    'Can I speak with a real person please?',
    'let me chat to someone from support',
    'Please connect me to an agent',
    'transfer me to customer service',
    'I need a human',
    'human please',
    'Agent!',
    'Chcę porozmawiać z człowiekiem',
    'Proszę połączyć mnie z konsultantem',
    'Ich möchte mit einem Mitarbeiter sprechen',
    'Verbinden Sie mich mit einem Menschen',
  ])('should match %p', (text) => {
    expect(matchesHumanRequest(text)).toBe(true);
  });

  it.each([
    'Is a human reviewing my refund?',
    'Where is my order 48213?',
    'This is the worst service ever',
    'The person at the door left my parcel outside',
    'Human resources asked me for an invoice',
  ])('should not match %p', (text) => {
    expect(matchesHumanRequest(text)).toBe(false);
  });
});
