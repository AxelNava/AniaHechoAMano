<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{
  isMainTitle?: boolean
}>()

const logoRef = ref<SVGSVGElement | null>(null)

function groupPathsByCharacter(paths: NodeListOf<SVGPathElement>) {
  return {
    A1: [paths[1]],
    n1: [paths[2]],
    i1: [paths[3]],
    i1Dot: [paths[0]],
    a1: [paths[4]],
    line: [paths[5]],
    h1: [paths[6]],
    e1: [paths[7]],
    c1: [paths[8]],
    h2: [paths[9]],
    o1: [paths[10]],
    a2: [paths[11]],
    m1: [paths[12]],
    a3: [paths[13]],
    n2: [paths[14]],
    o2: [paths[15]]
  }
}

function animateCharacter(paths: (SVGPathElement | undefined)[]) {
  paths.forEach((path) => {
    if (path) {
      path.style.transition = `stroke-dashoffset 0.4s ease-out, fill 0.2s ease-out 0.4s`
      path.style.strokeDashoffset = '0'

      setTimeout(() => {
        path.style.fill = 'var(--color-text-page, #701548)'
        path.style.stroke = 'transparent'
      }, 400)
    }
  })
}

function animateBrushStroke(paths: (SVGPathElement | undefined)[]) {
  paths.forEach((path) => {
    if (path) {
      path.style.transition = `stroke-dashoffset 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), fill 0.3s ease-out 0.8s`
      path.style.strokeWidth = '3'
      path.style.strokeDashoffset = '0'

      setTimeout(() => {
        path.style.fill = 'var(--color-text-page, #701548)'
        path.style.stroke = 'transparent'
      }, 800)
    }
  })
}

function animateLogo(logo: SVGSVGElement, characterGroups: ReturnType<typeof groupPathsByCharacter>) {
  logo.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out'
  logo.style.opacity = '1'
  logo.style.transform = 'scale(1)'

  const firstRowOrder = ['A1', 'n1', 'i1', 'i1Dot', 'a1'] as const
  const secondRowOrder = ['h1', 'e1', 'c1', 'h2', 'o1', 'a2', 'm1', 'a3', 'n2', 'o2'] as const

  let currentDelay = 200

  firstRowOrder.forEach((charKey) => {
    const group = characterGroups[charKey]
    if (group) {
      setTimeout(() => {
        animateCharacter(group)
      }, currentDelay)
      currentDelay += 150
    }
  })

  currentDelay += 200

  secondRowOrder.forEach((charKey) => {
    const group = characterGroups[charKey]
    if (group) {
      setTimeout(() => {
        animateCharacter(group)
      }, currentDelay)
      currentDelay += 120
    }
  })

  setTimeout(() => {
    animateBrushStroke(characterGroups.line)
  }, currentDelay + 300)

  setTimeout(() => {
    const heroText = document.querySelector('.hero-text')
    if (heroText) {
      heroText.classList.add('animate-fade-up')
    }
  }, currentDelay + 800)
}

onMounted(() => {
  const logo = logoRef.value
  if (!logo) return

  const paths = logo.querySelectorAll<SVGPathElement>('.logo-path')

  logo.style.opacity = '0'
  logo.style.transform = 'scale(0.8)'

  const characterGroups = groupPathsByCharacter(paths)

  paths.forEach((path) => {
    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`
    path.style.stroke = 'var(--color-text-page, #701548)'
    path.style.strokeWidth = '2'
    path.style.fill = 'transparent'
  })

  setTimeout(() => {
    animateLogo(logo, characterGroups)
  }, 500)
})
</script>

<template>
  <div
    class="grid justify-items-start"
    :class="{ 'flex justify-center': isMainTitle }"
    :id="isMainTitle ? 'title-complete' : ''"
  >
    <svg
      ref="logoRef"
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      id="ania-logo"
      class="animated-logo"
      width="500.000000pt"
      :height="isMainTitle ? '250.000000pt' : ''"
      viewBox="0 0 592.000000 307.000000"
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform="translate(0.000000,307.000000) scale(0.100000,-0.100000)">
        <path
          class="logo-path"
          d="M3247 2700 c-19 -22 -27 -43 -27 -68 0 -76 70 -139 126 -113 26 11 68 90 80 147 5 26 2 32 -21 42 -14 7 -49 15 -79 18 -50 6 -54 5 -79 -26z"
        />
        <path
          class="logo-path"
          d="M2030 2684 c-42 -36 -57 -69 -128 -279 -41 -121 -63 -203 -67 -250 -4 -38 -15 -108 -25 -155 -11 -47 -20 -125 -21 -174 l-2 -89 33 -29 c24 -20 45 -28 72 -28 49 0 68 27 68 100 0 30 7 96 15 145 8 50 15 93 15 97 0 4 21 10 48 13 26 4 67 13 91 21 50 16 61 9 61 -36 0 -49 30 -181 50 -219 33 -65 116 -109 168 -90 30 11 28 37 -14 154 -52 147 -77 299 -94 585 -6 96 -13 183 -16 192 -8 29 -106 68 -168 68 -44 0 -60 -5 -86 -26z m105 -309 c21 -165 20 -170 -12 -183 -16 -6 -45 -14 -65 -18 -46 -8 -46 -10 -13 116 52 201 58 221 67 212 5 -5 15 -62 23 -127z"
        />
        <path
          class="logo-path"
          d="M3663 2386 c-36 -31 -78 -116 -98 -198 -37 -159 1 -339 85 -396 46 -31 102 -45 134 -32 30 11 81 86 98 143 10 34 28 51 28 26 0 -6 10 -33 21 -60 17 -38 31 -55 60 -70 48 -24 81 -24 102 -1 22 24 22 29 -8 91 -27 55 -73 240 -94 375 -19 117 -5 106 -161 132 -116 19 -134 18 -167 -10z m165 -118 c17 -17 15 -148 -4 -221 -19 -73 -71 -180 -84 -172 -30 18 -37 136 -16 255 19 106 39 150 68 150 13 0 29 -5 36 -12z"
        />
        <path
          class="logo-path"
          d="M2576 2353 l-29 -15 6 -275 c4 -211 8 -279 19 -289 7 -7 39 -16 70 -20 66 -8 70 -4 88 101 11 66 61 180 90 207 32 30 43 23 36 -22 -7 -44 16 -191 37 -242 22 -50 61 -81 100 -80 41 2 87 18 87 31 0 6 -12 45 -26 88 -24 73 -26 90 -25 265 l0 187 -32 31 c-45 44 -70 47 -117 16 -34 -22 -67 -66 -167 -222 -10 -15 -12 4 -12 98 -1 114 -2 117 -27 137 -32 25 -58 26 -98 4z"
        />
        <path
          class="logo-path"
          d="M3243 2352 c-9 -6 -13 -69 -15 -232 -3 -198 -1 -230 15 -270 22 -55 52 -78 109 -86 l43 -6 -1 273 c-1 151 -2 277 -3 281 0 3 -16 16 -35 27 -33 21 -90 27 -113 13z"
        />
        <path
          class="logo-path"
          d="M1242 1579 c-175 -17 -299 -53 -477 -139 -147 -72 -298 -181 -293 -214 6 -41 42 -30 135 38 205 153 432 238 673 252 131 8 317 -21 650 -101 762 -183 883 -208 1230 -255 289 -40 627 -37 945 6 279 38 697 131 1050 233 318 92 304 86 289 125 -9 23 -37 20 -206 -24 -291 -76 -506 -115 -768 -140 -63 -6 -155 -15 -205 -21 -49 -5 -233 -14 -407 -21 -251 -9 -355 -9 -495 0 -347 24 -469 42 -930 136 -346 71 -649 114 -878 126 -200 10 -197 10 -313 -1z"
        />
        <path
          class="logo-path"
          d="M762 881 c-65 -142 -127 -322 -171 -501 -39 -154 -41 -166 -24 -177 9 -7 20 -13 24 -13 3 0 16 39 28 88 12 48 35 130 51 183 l30 96 142 6 c79 3 146 2 149 -2 4 -3 -9 -60 -27 -126 -46 -162 -50 -185 -33 -196 26 -16 37 -9 43 29 13 68 103 356 151 477 60 153 63 171 36 180 -11 3 -25 4 -30 0 -5 -3 -31 -72 -57 -154 l-48 -149 -70 -5 c-38 -2 -106 -2 -152 1 l-82 5 24 66 c14 36 44 106 66 154 33 69 40 92 31 105 -23 37 -39 24 -81 -67z"
        />
        <path
          class="logo-path"
          d="M2035 898 c-3 -7 -34 -94 -70 -192 -82 -223 -120 -363 -104 -382 19 -23 32 -16 104 57 70 71 147 129 172 129 11 0 13 -17 12 -74 -3 -81 8 -106 46 -106 52 0 79 35 33 42 -22 3 -23 8 -23 78 0 91 -14 120 -57 120 -37 0 -118 -51 -177 -112 -29 -28 -41 -36 -41 -24 0 9 34 109 76 222 66 176 75 209 66 230 -12 26 -30 32 -37 12z"
        />
        <path
          class="logo-path"
          d="M1634 641 c-64 -39 -125 -142 -141 -237 -8 -45 13 -99 43 -113 36 -16 55 -14 116 13 77 34 155 126 108 126 -6 0 -39 -20 -76 -45 -46 -32 -75 -45 -100 -45 -32 0 -34 2 -34 35 0 56 38 143 85 192 55 57 71 53 67 -16 -2 -46 0 -52 15 -49 10 2 26 20 36 40 17 34 17 39 2 67 -27 53 -69 64 -121 32z"
        />
        <path
          class="logo-path"
          d="M1276 613 c-68 -36 -116 -116 -116 -193 0 -80 42 -140 98 -140 33 0 97 38 113 66 18 35 7 38 -42 9 -81 -46 -123 -24 -117 61 l3 49 63 -3 c63 -4 63 -4 107 41 52 51 56 77 19 106 -32 25 -87 27 -128 4z m101 -40 c10 -26 -41 -63 -88 -63 -33 0 -40 3 -37 17 4 23 65 63 95 63 13 0 26 -7 30 -17z"
        />
        <path
          class="logo-path"
          d="M2485 612 c-43 -27 -104 -97 -126 -146 -28 -61 -25 -131 6 -161 13 -14 33 -25 45 -25 35 0 94 36 139 85 82 89 106 193 55 240 -32 30 -77 32 -119 7z m85 -47 c28 -33 -29 -159 -92 -206 -23 -16 -51 -29 -63 -27 -74 11 50 236 136 247 4 1 12 -6 19 -14z"
        />
        <path
          class="logo-path"
          d="M3105 600 c-68 -54 -155 -204 -155 -267 0 -41 30 -64 69 -53 47 13 73 31 133 88 l57 54 15 -36 c21 -51 60 -86 94 -86 16 0 31 3 35 6 11 11 -5 34 -23 34 -23 0 -57 42 -65 81 -4 16 -1 53 6 81 l13 51 -43 38 c-54 48 -85 50 -136 9z m99 -33 c28 -20 13 -49 -65 -132 -64 -67 -121 -106 -135 -92 -11 10 70 148 113 193 46 47 59 52 87 31z"
        />
        <path
          class="logo-path"
          d="M3735 618 c-2 -7 -18 -54 -35 -105 -35 -106 -43 -190 -20 -205 13 -8 31 6 90 67 76 78 127 121 136 113 2 -3 -8 -37 -22 -77 -14 -39 -23 -78 -20 -86 10 -26 41 -16 81 26 35 36 116 99 128 99 2 0 7 -28 10 -62 4 -48 11 -67 27 -80 27 -22 63 -23 80 -3 11 13 8 17 -19 26 -29 10 -31 14 -31 64 0 125 -48 144 -149 59 -35 -29 -49 -27 -32 4 23 43 0 92 -43 92 -19 0 -96 -49 -138 -88 -15 -14 -31 -23 -34 -19 -4 3 6 36 20 73 30 75 28 114 -5 114 -11 0 -21 -6 -24 -12z"
        />
        <path
          class="logo-path"
          d="M4385 598 c-71 -62 -155 -209 -155 -272 0 -30 23 -49 60 -48 37 1 72 23 142 90 l56 55 26 -51 c29 -56 53 -75 93 -70 39 5 39 25 0 42 -27 11 -39 25 -52 60 -16 42 -16 49 -1 93 l16 48 -45 43 c-55 53 -89 55 -140 10z m109 -40 c8 -13 7 -24 -4 -42 -36 -57 -162 -176 -187 -176 -7 0 -13 7 -13 16 0 27 61 125 109 177 47 50 74 57 95 25z"
        />
        <path
          class="logo-path"
          d="M5293 601 c-49 -35 -85 -81 -112 -141 -30 -65 -27 -113 7 -151 25 -28 33 -31 63 -25 93 17 199 152 199 253 0 46 -3 54 -29 72 -40 29 -81 26 -128 -8z m101 -43 c16 -25 -19 -123 -60 -168 -66 -72 -133 -76 -118 -6 19 89 114 204 158 192 5 -1 14 -10 20 -18z"
        />
        <path
          class="logo-path"
          d="M4790 601 c0 -10 -15 -52 -34 -94 -51 -111 -59 -147 -39 -169 23 -25 34 -23 64 15 29 36 173 137 195 137 11 0 14 -15 14 -63 0 -72 18 -107 56 -107 23 0 24 2 12 23 -7 12 -13 51 -13 87 0 80 -21 120 -63 120 -16 0 -58 -21 -99 -49 -40 -27 -73 -45 -73 -39 0 5 10 32 21 59 18 41 20 54 11 74 -14 30 -52 34 -52 6z"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
:root {
  --primary-color: var(--color-text-page, #701548);
  --secondary-color: var(--color-secondary, #d4b5d4);
  --background-color: var(--color-primary, #e8d5e8);
  --text-dark: #2d1b2d;
  --text-light: #6b4c6b;
  --white: #ffffff;
  --shadow: 0 4px 20px rgba(112, 21, 72, 0.1);
  --shadow-hover: 0 8px 30px rgba(112, 21, 72, 0.2);
  --border-radius: 16px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-text {
  opacity: 0;
}

@media (max-width: 768px) {
  .animated-logo {
    max-height: 200px;
  }
}

@media (max-width: 480px) {
  .animated-logo {
    max-height: 150px;
  }
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fade-up {
  animation: fadeInUp 0.8s ease-out forwards;
}

.animate-scale {
  animation: scaleIn 0.6s ease-out forwards;
}
</style>
