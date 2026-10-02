// Drafts golden questions from markdown docs.
//
//   npm run synthesize [-- docs_dir]   # default: the seed help center docs
//
// Each "## " section becomes one context, so every golden is grounded in a
// known section. Writes goldens.draft.json in the goldens.json format: review
// the questions and expected outputs by hand, then merge the good ones into
// goldens.json. Synthetic questions skew easy and literal; keep the
// hand-written follow-ups, multilingual and out-of-scope cases alongside them.
import Anthropic from '@anthropic-ai/sdk';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DOCS = fileURLToPath(
  new URL('../../src/database/seeds/relational/resource/docs', import.meta.url),
);
const OUTPUT = fileURLToPath(new URL('./goldens.draft.json', import.meta.url));
const MODEL = process.env.RAG_JUDGE_MODEL ?? 'claude-sonnet-5-5';

const GOLDEN_SCHEMA = {
  type: 'object',
  properties: {
    input: { type: 'string' },
    expected_output: { type: 'string' },
  },
  required: ['input', 'expected_output'],
  additionalProperties: false,
};

/** (source label, text) per level-2 section; the intro counts as one. */
function sections(path) {
  const stem = basename(path, '.md');
  return readFileSync(path, 'utf8')
    .split(/^(?=## )/m)
    .filter((part) => part.trim().length > 80)
    .map((part) => {
      const heading = part.match(/^##?\s+(.+)$/m);
      return {
        source: heading ? `${stem} > ${heading[1].trim()}` : stem,
        text: part.trim(),
      };
    });
}

async function draftGolden(client, section) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: GOLDEN_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: [
          'Below is a section of an online shop help center. Write one question',
          'a customer could realistically send to support that this section',
          'answers, phrased the way customers write (no quoting of headings),',
          'and the answer support should give, using only facts from the section.',
          '',
          '<section>',
          section.text,
          '</section>',
        ].join('\n'),
      },
    ],
  });
  if (response.stop_reason === 'refusal') {
    throw new Error(`refused for ${section.source}`);
  }
  const text = response.content.find((block) => block.type === 'text');
  return { ...JSON.parse(text.text), source: section.source };
}

async function main() {
  const docsDir = process.argv[2] ?? DEFAULT_DOCS;
  const labelled = readdirSync(docsDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .flatMap((name) => sections(join(docsDir, name)));
  if (!labelled.length) {
    console.error(`No markdown sections found in ${docsDir}`);
    process.exit(1);
  }

  const client = new Anthropic();
  const goldens = await Promise.all(
    labelled.map((section) => draftGolden(client, section)),
  );
  const drafts = goldens.map((golden, index) => ({
    name: `synthetic-${index + 1}`,
    input: golden.input,
    expected_status: 'answered',
    expected_output: golden.expected_output,
    source: golden.source,
  }));
  writeFileSync(OUTPUT, JSON.stringify(drafts, null, 2) + '\n');
  console.log(`Wrote ${drafts.length} draft goldens to ${OUTPUT}`);
}

await main();
