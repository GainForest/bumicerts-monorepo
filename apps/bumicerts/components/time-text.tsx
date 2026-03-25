"use client";

import React from "react";
import { format as formatFn, formatDistanceToNow } from "date-fns";

const TimeText = ({
  date,
  format = "relative",
}: {
  date: Date;
  format?:
    | "relative"
    | "absolute-date"
    | "absolute-time"
    | "absolute-date-time";
}) => {
  const formatDate = () => {
    switch (format) {
      case "relative":
        return formatDistanceToNow(date, { addSuffix: true });
      case "absolute-date":
        return formatFn(date, "d MMM, yyyy");
      case "absolute-time":
        return formatFn(date, "h:mm a");
      case "absolute-date-time":
        return formatFn(date, "MMM d, yyyy h:mm a");
      default:
        return formatDistanceToNow(date, { addSuffix: true });
    }
  };

  return <>{formatDate()}</>;
};

export default TimeText;
