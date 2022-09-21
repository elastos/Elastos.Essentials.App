import { ThemeConfig } from "./theme";

export const availableThemes: ThemeConfig[] = [
  {
    key: "blue",
    variants: {
      "light": { color: "#172F4C" },
      "dark": { color: "#395980" }
    },
    usesDarkMode: true
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
    key: "red",
    variants: {
      "light": { color: "#4C1717" },
      "dark": { color: "#802727" }
    },
    usesDarkMode: true
  },
  {
    key: "white",
    variants: {
      "light": { color: "#F2F2F2", boxColor: "#FFFFFF" },
      "dark": { color: "#FFFFFF", boxColor: "rgba(0,0,0,0.05)" }
    },
    usesDarkMode: false
  },


  //{ key: "purple", color: "#30224C", usesDarkMode: true },

  /*   { key: "green", color: "#44B93A", usesDarkMode: true },
   */
  /*   { key: "yellow", color: "#DFC01C", usesDarkMode: false }, */
  /*   { key: "orange", color: "#D6873F", usesDarkMode: true },
    { key: "pink", color: "#FFAAAA", usesDarkMode: false },*/
];