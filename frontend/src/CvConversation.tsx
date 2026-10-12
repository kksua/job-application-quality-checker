import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  converseAboutCv,
  type CvConversationMessage,
} from "./api/tailoring";
import type { StructuredCv } from "./types/cv";

interface CvConversationProps {
  cv: StructuredCv;
  jobDescription: string;
  onCvChange: (cv: StructuredCv) => void;
  onControlsHostChange: (node: HTMLDivElement | null) => void;
}

function structuredCvsMatch(firstCv: StructuredCv, secondCv: StructuredCv): boolean {
  return JSON.stringify(firstCv) === JSON.stringify(secondCv);
}

export function CvConversation({
  cv,
  jobDescription,
  onCvChange,
  onControlsHostChange,
}: CvConversationProps) {
  const [messages, setMessages] = useState<CvConversationMessage[]>([]);
  const [pendingCv, setPendingCv] = useState<StructuredCv | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, isSending]);

  const latestAssistantIndex = messages.reduce(
    (latestIndex, item, index) =>
      item.role === "assistant" ? index : latestIndex,
    -1,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = message.trim();

    if (!content || isSending) {
      return;
    }

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setMessage("");
    setError(null);
    setIsSending(true);

    try {
      const sourceCv = pendingCv ?? cv;
      const result = await converseAboutCv({
        cv: sourceCv,
        jobDescription,
        messages: nextMessages,
      });

      setPendingCv(
        structuredCvsMatch(sourceCv, result.cv) ? null : result.cv,
      );
      setMessages([
        ...nextMessages,
        { role: "assistant", content: result.reply },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The CV could not be updated from this conversation.",
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="cv-conversation-column">
    <section className="cv-conversation" aria-label="CV editing conversation">
      <header className="cv-conversation-header">
        <div className="cv-avatar cv-avatar-small" aria-hidden="true">
          <span />
        </div>
        <div>
          <p className="cv-conversation-eyebrow">Your CV assistant</p>
          <h2>Emma</h2>
        </div>
      </header>

      <div
        className="cv-conversation-messages"
        aria-live="polite"
        aria-label="Conversation messages"
      >
        {messages.length === 0 ? (
          <div className="cv-conversation-welcome">
            <div className="cv-avatar cv-avatar-large" aria-hidden="true">
              <span />
            </div>
            <h3>Hi, I’m Emma!</h3>
            <p>
              I can help with this CV, job matching, and safe CV edits only.
            </p>
            <span className="cv-conversation-hint">
              Try “Make my summary more concise”
            </span>
          </div>
        ) : (
          messages.map((item, index) => (
            <article
              className={`cv-conversation-message ${item.role}`}
              key={`${item.role}-${index}`}
            >
              <strong>{item.role === "user" ? "You" : "CV assistant"}</strong>
              <p>{item.content}</p>
              {item.role === "assistant" &&
                index === latestAssistantIndex &&
                pendingCv && (
                  <div className="cv-conversation-proposal-actions">
                    <span>Suggested update · not applied yet</span>
                    <button
                      aria-label="Apply suggested CV changes"
                      className="cv-conversation-accept"
                      onClick={() => {
                        onCvChange(pendingCv);
                        setPendingCv(null);
                      }}
                      title="Apply these changes to your CV"
                      type="button"
                    >
                      ✓
                    </button>
                  </div>
                )}
            </article>
          ))
        )}
        {isSending && (
          <p className="cv-conversation-status" role="status">
            Updating your CV…
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="cv-conversation-form" onSubmit={handleSubmit}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <label htmlFor="cv-conversation-input">Your CV edit request</label>
        <textarea
          id="cv-conversation-input"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask for a CV or job-match improvement..."
          rows={3}
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !message.trim()}
        >
          {isSending
            ? "Preparing suggestion…"
            : "Send suggestion"}
        </button>
      </form>
    </section>
    <div
      className="cv-editor-controls-slot"
      ref={onControlsHostChange}
    />
    </div>
  );
}
