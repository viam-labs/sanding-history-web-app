<script lang="ts">
    import { MotionTools } from "@viamrobotics/motion-tools";
    import { Snapshot, SnapshotProto } from "@viamrobotics/motion-tools/lib";
    import { ViamProvider } from "@viamrobotics/svelte-sdk";
    import { Struct } from "@viamrobotics/sdk";

    interface SvelteSnapshotProps {
        snapshot: SnapshotProto;
    }
    const { snapshot }: SvelteSnapshotProps = $props<SvelteSnapshotProps>();
  

  </script>
  
  <ViamProvider dialConfigs={{}}>
    <MotionTools
					localConfigProps={{
						current: new Struct(),
						setLocalPartConfig: () => {},
						isDirty: false,
						componentToFragId: {},
					}}
				>
        <Snapshot snapshot={snapshot} />
    </MotionTools>
  </ViamProvider>
  