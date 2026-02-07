import React from "react";
import { cn } from "../lib/utils";

type CharacterLimitHintProps = {
  currentLength: number;
  maxLength: number;
  className?: string;
  

  alwaysShow?: boolean;
  

  warnAt?: number;
};

const DEFAULT_THRESHOLD = 25;

export const CharacterLimitHint: React.FC<CharacterLimitHintProps> = ({
  currentLength,
  maxLength,
  className,
  alwaysShow = true,
  warnAt = DEFAULT_THRESHOLD,
}) => {
  const safeLength = Math.max(0, currentLength);
  const remaining = Math.max(maxLength - safeLength, 0);
  const isAtLimit = remaining === 0;
  const isNearLimit = remaining <= warnAt;
  const shouldRender = alwaysShow || safeLength > 0 || isAtLimit;

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between text-xs",
        isAtLimit
          ? "text-red-600"
          : isNearLimit
            ? "text-amber-600"
            : "text-gray-500",
        className
      )}
    >
      <span>{`Max ${maxLength} characters allowed`}</span>
      <span>{`${remaining} left`}</span>
    </div>
  );
};

