"use client";

import { motion } from "framer-motion";
import type { OrganizationData } from "@/lib/types";

export function OrgAbout({ organization }: { organization: OrganizationData }) {
  const paragraphs = organization.longDescription.split("\n\n").filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="p-4 md:p-5 mt-6"
    >
      <h2 className="font-serif text-2xl font-bold mb-4">About Organization</h2>
      <div className="max-w-prose">
        {paragraphs.map((para, i) => (
          <p
            key={i}
            className={`text-base leading-relaxed text-foreground/90 mb-4 last:mb-0 ${
              i === 0
                ? "before:content-none"
                : ""
            }`}
            style={
              i === 0
                ? {
                    // Drop-cap via inline style so first letter is styled
                  }
                : {}
            }
          >
            {i === 0 ? (
              <>
                <span
                  className="float-left mr-2 mt-1 leading-none"
                  style={{
                    fontFamily: "var(--font-garamond-var)",
                    fontSize: "3.5rem",
                    lineHeight: 1,
                    color: "var(--primary)",
                  }}
                >
                  {para.charAt(0)}
                </span>
                {para.slice(1)}
              </>
            ) : (
              para
            )}
          </p>
        ))}
      </div>
    </motion.div>
  );
}
