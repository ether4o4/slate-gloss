package com.neversoftos.mve.sandbox

/** Keep the head and tail of oversized output, marking what was dropped. */
fun String.smartTruncate(maxLength: Int): String {
  if (length <= maxLength) return this
  val keep = (maxLength - 80) / 2
  return take(keep) +
      "\n[... ${length - 2 * keep} characters truncated ...]\n" +
      takeLast(keep)
}
