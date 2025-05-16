export function getStrengthColor(strength: string): string {
  switch (strength) {
    case "Very Strong":
      return "bg-green-500 text-white";
    case "Strong":
      return "bg-lime-400 text-black";
    case "Medium":
      return "bg-yellow-400 text-black";
    case "Weak":
    default:
      return "bg-red-400 text-white";
  }
}

export function getStrengthDotColor(strength: string): string {
  switch (strength) {
    case "Very Strong":
      return "bg-green-500";
    case "Strong":
      return "bg-lime-400";
    case "Medium":
      return "bg-yellow-400";
    case "Weak":
    default:
      return "bg-red-400";
  }
}

export function getStrengthLabel(interactionCount: number): string {
  if (interactionCount > 50) return "Very Strong";
  if (interactionCount > 20) return "Strong";
  if (interactionCount > 5) return "Medium";
  return "Weak";
}
