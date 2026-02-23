import { useState } from "react";

import { Button } from "@/components/ui/button";

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <Button onClick={() => setCount((value) => value + 1)}>Increment</Button>
      <span className="text-sm text-muted-foreground">count: {count}</span>
    </div>
  );
}
