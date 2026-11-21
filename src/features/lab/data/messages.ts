/**
 * Synthetic messages for the M-PHISH exhibit. Every address uses reserved
 * example domains (RFC 2606), and no link is ever rendered as a real link.
 * The rules below are a small teaching sketch that runs in the browser.
 * They are not the M-PHISH engine and make no claim about its accuracy.
 */

export interface Message {
  id: string;
  label: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  body: string;
  link: string;
}

export const messages: Message[] = [
  {
    id: "library",
    label: "Account notice",
    fromName: "Library Desk",
    fromAddress: "notice@library-desk.example",
    subject: "Your account will be paused",
    body: "We could not verify your student account. Sign in within 24 hours to keep access to your borrowed books.",
    link: "https://login-verify.example.com/account",
  },
  {
    id: "events",
    label: "Event update",
    fromName: "Campus Events",
    fromAddress: "events@campus.example.org",
    subject: "Hackathon schedule is out",
    body: "The schedule for Saturday is now on the events page. No sign-in is needed to view it.",
    link: "https://campus.example.org/events/hackathon",
  },
  {
    id: "refund",
    label: "Refund request",
    fromName: "Payments Team",
    fromAddress: "billing@payments.example.net",
    subject: "Refund pending: confirm card details",
    body: "A refund is waiting for you. Confirm your card number and OTP today to release it.",
    link: "http://refund-payments.example.com/claim",
  },
];

export type Severity = "info" | "warn" | "risk";

export interface Signal {
  id: string;
  title: string;
  explain: string;
  severity: Severity;
  /** Which part of the message to highlight, and the exact text. */
  where: "from" | "body" | "link";
  match: string;
}

const host = (url: string) => url.replace(/^[a-z]+:\/\//i, "").split("/")[0].toLowerCase();
const registrable = (h: string) => h.split(".").slice(-2).join(".");

export function inspect(m: Message): { signals: Signal[]; level: "Low" | "Caution" | "High"; summary: string } {
  const signals: Signal[] = [];
  const senderDomain = m.fromAddress.split("@")[1];
  const linkHost = host(m.link);

  if (registrable(senderDomain) !== registrable(linkHost)) {
    signals.push({
      id: "mismatch",
      title: "Link goes somewhere else",
      explain: `The sender writes from ${senderDomain}, but the link opens ${linkHost}. A mismatch between who claims to write and where you are sent is a classic sign.`,
      severity: "risk",
      where: "link",
      match: linkHost,
    });
  }
  if (/^http:\/\//i.test(m.link)) {
    signals.push({
      id: "insecure",
      title: "Link is not encrypted",
      explain: "The address starts with http, not https, so anything typed there travels unprotected.",
      severity: "warn",
      where: "link",
      match: "http://",
    });
  }
  const cred = m.body.match(/sign in|password|otp|card number/i);
  if (cred) {
    signals.push({
      id: "credentials",
      title: "Asks for credentials",
      explain: "The message wants you to sign in or share secrets such as a card number or OTP. Legitimate services rarely ask for these by message.",
      severity: "risk",
      where: "body",
      match: cred[0],
    });
  }
  const urgent = m.body.match(/within \d+ hours|today|immediately|paused/i) ?? m.subject.match(/paused|pending/i);
  if (urgent && m.body.includes(urgent[0])) {
    signals.push({
      id: "urgency",
      title: "Creates time pressure",
      explain: "A short deadline pushes you to act before you check. Pressure is a common persuasion tactic.",
      severity: "warn",
      where: "body",
      match: urgent[0],
    });
  }
  const bait = linkHost.match(/login|verify|secure|refund/);
  if (bait) {
    signals.push({
      id: "bait",
      title: "Persuasive words in the address",
      explain: `The link host contains “${bait[0]}”, a word chosen to look official rather than to identify a real service.`,
      severity: "warn",
      where: "link",
      match: bait[0],
    });
  }

  const score = signals.reduce((s, x) => s + (x.severity === "risk" ? 2 : 1), 0);
  const level = score >= 4 ? "High" : score >= 1 ? "Caution" : "Low";
  const summary =
    level === "High"
      ? "Don’t use the link. Open the service by typing its address yourself, or ask the sender through a channel you already trust."
      : level === "Caution"
        ? "Check the sender and the destination before acting."
        : "No warning signs from these checks. The sender and the link agree, nothing asks for credentials, and there is no pressure to act. Staying alert is still wise.";
  return { signals, level, summary };
}
