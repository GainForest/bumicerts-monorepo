type VerificationCodeEmailProps = {
  otp: string;
  pdsDomain: string;
};

export function VerificationCodeEmail({ otp, pdsDomain }: VerificationCodeEmailProps) {
  const systemFont =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
  const serifFont = "'EB Garamond', Georgia, 'Times New Roman', serif";
  const monoFont = "'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace";

  return (
    <div
      style={{
        backgroundColor: "#f5f7f5",
        fontFamily: systemFont,
        color: "#0a0a0a",
        margin: "0",
        padding: "0",
      }}
    >
      {/* Google Fonts import for EB Garamond */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');`}</style>

      {/* Outer wrapper: full-width sage-tinted background */}
      <div
        style={{
          padding: "48px 16px",
        }}
      >
        {/* Inner card: 560px, white, subtle border, generous radius */}
        <div
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
          }}
        >
          {/* ── Header section ── */}
          <div style={{ padding: "48px 48px 0" }}>
            {/* Logo mark */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://bumicerts.gainforest.app/assets/media/images/logo.png"
              alt="Bumicerts"
              width={36}
              height={36}
              style={{ display: "block", borderRadius: "10px" }}
            />

            {/* Thin green decorative rule */}
            <div
              style={{
                width: "32px",
                height: "1px",
                backgroundColor: "#2FCE8A",
                marginTop: "24px",
              }}
            />

            {/* Garamond headline */}
            <h1
              style={{
                margin: "20px 0 0",
                fontSize: "28px",
                fontWeight: 400,
                letterSpacing: "-0.02em",
                lineHeight: "1.25",
                color: "#0a0a0a",
                fontFamily: serifFont,
              }}
            >
              Your verification code for
              <br />
              <span style={{ fontStyle: "italic", color: "#0a0a0a" }}>
                {pdsDomain}
              </span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                margin: "12px 0 0",
                fontSize: "15px",
                color: "#6b7280",
                lineHeight: "1.6",
                fontFamily: systemFont,
              }}
            >
              Use this code to verify your email and complete your account setup.
            </p>
          </div>

          {/* ── Code section ── */}
          <div style={{ padding: "40px 48px 44px" }}>
            {/* Section label: uppercase, tracked, muted */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#9ca3af",
                marginBottom: "16px",
                fontFamily: systemFont,
              }}
            >
              Verification Code
            </div>

            {/* Code container: sage-tinted, soft green border */}
            <div
              style={{
                backgroundColor: "#f0f7f4",
                border: "1px solid #c5edd9",
                borderRadius: "12px",
                padding: "28px 32px",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontSize: "48px",
                  fontWeight: 600,
                  letterSpacing: "0.3em",
                  color: "#0a0a0a",
                  fontFamily: monoFont,
                }}
              >
                {otp}
              </span>
            </div>

            {/* Expiry notice */}
            <p
              style={{
                margin: "16px 0 0",
                fontSize: "13px",
                color: "#9ca3af",
                lineHeight: "1.5",
                fontFamily: systemFont,
              }}
            >
              This code will expire in 10 minutes. If you didn&apos;t request this code, you can safely ignore this email.
            </p>
          </div>

          {/* ── Footer section ── */}
          <div style={{ padding: "0 48px 44px" }}>
            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "24px" }}>
              {/* Garamond italic tagline */}
              <p
                style={{
                  margin: "0",
                  fontFamily: serifFont,
                  fontStyle: "italic",
                  fontSize: "14px",
                  color: "#b0b0b0",
                  lineHeight: "1.5",
                }}
              >
                Regenerating ecosystems, together
              </p>
              {/* Attribution */}
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "12px",
                  color: "#c0c0c0",
                  fontFamily: systemFont,
                }}
              >
                Bumicerts by GainForest
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
