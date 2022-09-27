import { ThemeConfig } from "./theme";

export const availableThemes: ThemeConfig[] = [
  {
    key: "white",
    variants: {
      "light": { color: "#F2F2F2", boxColor: "#FFFFFF" },
      "dark": { color: "#FFFFFF", boxColor: "rgba(0,0,0,0.05)" }
    },
    usesDarkMode: false
  },
  {
    key: "black",
    variants: {
      "light": { color: "#000000" },
      "dark": { color: "#212021", boxColor: "#000000" }
    },
    usesDarkMode: true
  },
  {
    key: "blue",
    variants: {
      "light": { color: "#172F4C" },
      "dark": { color: "#395980" }
    },
    usesDarkMode: true
  },
  {
    key: "red",
    variants: {
      "light": { color: "#4C1717" },
      "dark": { color: "#802727" }
    },
    usesDarkMode: true
  },
  {
    key: "purple",
    variants: {
      "light": { color: "#30224C" },
      "dark": { color: "#533991" }
    },
    usesDarkMode: true
  },
  {
    key: "yellow",
    variants: {
      "light": { color: "#BF9C3B" },
      "dark": { color: "#F2C64B" }
    },
    usesDarkMode: false
  },
  {
    key: "orange",
    variants: {
      "light": { color: "#BF733B" },
      "dark": { color: "#F2914B" }
    },
    usesDarkMode: true
  },
  {
    key: "green",
    variants: {
      "light": { color: "#224C33" },
      "dark": { color: "#398055" }
    },
    usesDarkMode: true
  },
  {
    key: "pink",
    variants: {
      "light": { color: "#B05CB2", buttonBackgroundColor: "#000000", buttonTextColor: "#ffffff" },
      "dark": { color: "#E376E5" }
    },
    usesDarkMode: true
  },
];