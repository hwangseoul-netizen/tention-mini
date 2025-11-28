"use client";

import React from "react";

type CatKey = "Vibes" | "Friends" | "Workout" | "Try";

const CATS: { key: CatKey; label: string; icon: string; color: string }[] = [
  { key: "Vibes",   label: "Vibes",   icon: "✨", color: "#FF5CAB" },
  { key: "Friends", label: "Friends", icon: "🤝", color: "#2EE778" },
  { key: "Workout", label: "Move",    icon: "💪", color: "#FFA23B" }, // 라벨만 Move
  { key: "Try",     label: "Try",     icon: "🧪", color: "#6AAEFF" },
];

export default function CategoryRow({
  active,
  onPick,
}: {
  active: CatKey | "";
  onPick: (k: CatKey) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 8,
        padding: "0 12px",
      }}
    >
      {CATS.map((c) => {
        const on = active === c.key;
        return (
          <button
            key={c.key}
            onClick={() => onPick(c.key)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 14,
              borderWidth: 2,
              borderStyle: "solid",
              borderColor: c.color,
              // ✅ 기본은 다크, 선택 시 안쪽까지 컬러
              backgroundColor: on ? c.color : "#151821",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: on ? `0 0 16px ${c.color}55` : "none",
              padding: "0 10px",
            }}
          >
            <span
              style={{
                fontWeight: 900,
                fontSize: 14,
                whiteSpace: "nowrap",
                // 선택 시 글자는 진한 네이비, 아닐 땐 카테고리 컬러
                color: on ? "#0D0F13" : c.color,
              }}
            >
              {c.icon} {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
