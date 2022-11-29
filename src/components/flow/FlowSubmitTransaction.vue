
<script setup lang="ts">
import type { TransactionReceipt } from "@onflow/fcl";

const props = withDefaults(
  defineProps<{
    method: () => Promise<string>;
    content?: string;
  }>(),
  {
    content: "Submit",
  }
);

const emit = defineEmits<{
  (e: "sealed", tx: TransactionReceipt): void;
  (e: "error", message: string): void;
}>();

// expose members
defineExpose({
  resetComponent: ref(() => {
    txid.value = null;
    errorMessage.value = null;
    isSealed.value = false;
  }),
});

const txid = ref<string | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const isSealed = ref(false);

async function startTransaction() {
  if (isLoading.value) return;

  isLoading.value = true;
  errorMessage.value = null;
  isSealed.value = false;
  try {
    txid.value = await props.method();
  } catch (err: any) {
    console.error(err);
    const msg = String(err.reason ?? err.message ?? "rejected");
    errorMessage.value = msg.length > 60 ? msg.slice(0, 60) + "..." : msg;
    emit("error", errorMessage.value);
  }
  isLoading.value = false;
}

function onSealed(tx: TransactionReceipt) {
  isSealed.value = true;
  emit("sealed", tx);
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <template v-if="!txid">
      <button :class="[
        {
          'no-animation': isLoading,
          loading: isLoading,
        },
      ]" role="button" aria-disabled="true" @click="startTransaction">
        <slot>
          {{ content }}
        </slot>
      </button>
      <p v-if="errorMessage" class="px-4 text-sm text-error max-w-[240px]">
        {{ errorMessage }}
      </p>
    </template>
    <FlowWaitTransaction v-else :txid="txid" @sealed="onSealed" />
    <slot v-if="isSealed" name="next"></slot>
  </div>
</template>