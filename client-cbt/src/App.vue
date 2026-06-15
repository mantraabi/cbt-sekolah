<script setup>
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <router-view />

  <Toaster position="top-center" rich-colors />
</template>