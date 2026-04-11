import { ref, watch, onMounted } from "vue";

const isDark = ref(false);

export function useDarkMode() {
  onMounted(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) {
      isDark.value = saved === "true";
    } else {
      isDark.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    applyTheme();
  });

  watch(isDark, () => {
    applyTheme();
    localStorage.setItem("darkMode", String(isDark.value));
  });

  function applyTheme() {
    if (isDark.value) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function toggle() {
    isDark.value = !isDark.value;
  }

  return {
    isDark,
    toggle,
  };
}
