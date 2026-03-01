"use client";

import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// Extend dayjs with relative time plugin
dayjs.extend(relativeTime);

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
    const dayjsDate = dayjs(date);

    switch (format) {
      case "relative":
        return dayjsDate.fromNow();
      case "absolute-date":
        return dayjsDate.format("D MMM, YYYY");
      case "absolute-time":
        return dayjsDate.format("h:mm A");
      case "absolute-date-time":
        return dayjsDate.format("MMM D, YYYY h:mm A");
      default:
        return dayjsDate.fromNow();
    }
  };

  return <>{formatDate()}</>;
};

export default TimeText;
