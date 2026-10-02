import { VoyageAIClient } from 'voyageai';

// Voyage accepts at most 128 inputs per request.
const MAX_BATCH = 128;

export class DenseEmbedder {
  constructor(
    private readonly client: VoyageAIClient | null,
    private readonly model: string,
    private readonly dimension: number,
  ) {}

  // `document` and `query` input types prepend different instructions on
  // Voyage's side; mixing them up measurably hurts retrieval.
  async embedDocuments(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH) {
      vectors.push(
        ...(await this.embed(texts.slice(i, i + MAX_BATCH), 'document')),
      );
    }
    return vectors;
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.embed([text], 'query');
    return vector;
  }

  private async embed(
    input: string[],
    inputType: 'document' | 'query',
  ): Promise<number[][]> {
    if (!this.client) {
      throw new Error('VOYAGE_API_KEY is not configured');
    }

    const response = await this.client.embed({
      input,
      model: this.model,
      inputType,
      outputDimension: this.dimension,
    });
    const data = [...(response.data ?? [])].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0),
    );
    if (
      data.length !== input.length ||
      data.some(({ embedding }) => !embedding?.length)
    ) {
      throw new Error(
        `Voyage returned ${data.length} embeddings for ${input.length} inputs`,
      );
    }

    return data.map(({ embedding }) => embedding!);
  }
}

export function createDenseEmbedder(config: {
  voyageApiKey?: string;
  embeddingModel: string;
  embeddingDimension: number;
}): DenseEmbedder {
  return new DenseEmbedder(
    // Fail on use instead of boot, like the Anthropic clients.
    config.voyageApiKey
      ? new VoyageAIClient({ apiKey: config.voyageApiKey })
      : null,
    config.embeddingModel,
    config.embeddingDimension,
  );
}
