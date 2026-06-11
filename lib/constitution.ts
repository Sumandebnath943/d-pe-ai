/**
 * The Constitution — the explicit, editable rule-set that every generated prompt
 * is critiqued against before it's handed to the user. Inspired by Anthropic's
 * Constitutional AI: rather than relying on implicit judgement, we write the
 * principles down so the critique is transparent and tunable.
 *
 * Edit this list to change what "responsible" means for your deployment. Each
 * rule's `id` is referenced by the critique findings, so keep ids stable.
 */

export type ConstitutionCategory =
  | 'safety'
  | 'legality'
  | 'privacy'
  | 'honesty'
  | 'fairness'
  | 'responsibility';

export interface ConstitutionRule {
  id: string;
  title: string;
  category: ConstitutionCategory;
  description: string;
}

export const CONSTITUTION: ConstitutionRule[] = [
  {
    id: 'no_harm',
    title: 'No facilitation of harm',
    category: 'safety',
    description:
      'The prompt must not instruct the AI to help plan, enable, or encourage physical harm, violence, weapons creation, self-harm, or dangerous activities.',
  },
  {
    id: 'no_illegal',
    title: 'No illegal activity',
    category: 'legality',
    description:
      'The prompt must not facilitate crime, fraud, hacking, malware, evading law enforcement, or any clearly illegal act.',
  },
  {
    id: 'privacy',
    title: 'Respect privacy',
    category: 'privacy',
    description:
      'The prompt must not solicit, expose, infer, or process personal or sensitive data (PII, health, financial, biometric) in ways a reasonable person would object to, and must not enable surveillance or doxxing.',
  },
  {
    id: 'no_deception',
    title: 'No deception or manipulation',
    category: 'honesty',
    description:
      'The prompt must not be designed to deceive, manipulate, scam, impersonate real people, or mass-produce disinformation or misleading propaganda.',
  },
  {
    id: 'fairness',
    title: 'Fairness and non-discrimination',
    category: 'fairness',
    description:
      'The prompt must not encourage hateful, harassing, demeaning, or discriminatory output toward people based on protected characteristics, nor bake in unfair bias.',
  },
  {
    id: 'honesty',
    title: 'Honesty and calibrated uncertainty',
    category: 'honesty',
    description:
      'The prompt should push the AI to be truthful, avoid fabricating facts or sources, and acknowledge uncertainty rather than bluffing.',
  },
  {
    id: 'ip',
    title: 'Respect intellectual property',
    category: 'legality',
    description:
      'The prompt must not facilitate plagiarism, large-scale copyright infringement, or passing off others’ work as original.',
  },
  {
    id: 'explicit',
    title: 'No exploitative or non-consensual content',
    category: 'safety',
    description:
      'The prompt must never enable sexual content involving minors, non-consensual sexual content, or sexualized depictions of real identifiable people.',
  },
  {
    id: 'professional_boundaries',
    title: 'Responsible high-stakes advice',
    category: 'responsibility',
    description:
      'For medical, legal, financial, or psychological topics, the prompt should encourage appropriate caution, disclaimers, and deference to qualified professionals rather than authoritative individualized directives.',
  },
  {
    id: 'guardrails',
    title: 'Built-in refusal guardrails',
    category: 'responsibility',
    description:
      'The prompt should instruct the AI on how to gracefully refuse or redirect requests that fall outside its safe scope, rather than complying with anything asked.',
  },
];

/** Render the constitution as a numbered block for inclusion in a critique prompt. */
export function formatConstitution(): string {
  return CONSTITUTION.map(
    (r) => `- [${r.id}] ${r.title} (${r.category}): ${r.description}`
  ).join('\n');
}
