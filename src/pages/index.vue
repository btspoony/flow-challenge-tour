<script setup lang="ts">
const config = useRuntimeConfig();
const appName = ref(config.public.appName)
</script>

<template>
  <FrameMain>
    <div class="hero min-h-[calc(100vh-180px)]">
      <div class="page-container hero-content flex-col lg:flex-row-reverse">
        <img src="~/assets/images/home-flow.png" alt="home flow" class="max-w-xs" />
        <div>
          <h3 class="text-5xl font-bold">
            Learn and earn rewards by completing <strong class="text-primary">#onFlow</strong> Challenges
          </h3>
          <p class="py-6">
            Plan to start the web3 journey? The {{ appName }} will be your guide.<br />
            Ready to begin?
          </p>
          <div class="flex-center lg:flex-between">
            <BtnGoPage next="/active" class="max-w-xs">Start the Competition</BtnGoPage>
          </div>
        </div>
      </div>
    </div>
  </FrameMain>
</template>
