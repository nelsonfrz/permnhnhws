import { Button } from '@/components/ui/button';
import { createFileRoute } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BoundaryConditionsForm } from '@/components/dashboard/boundary-conditions-form';
import { InitialConditionsGridEditor } from '@/components/dashboard/initial-conditions-grid-editor';

export const Route = createFileRoute('/dashboard/simulation')({
  component: RouteComponent,
});

export type Node = {
  matrixPotential: number;
};

function RouteComponent() {
  return (
    <div className="p-4">
      <div className="flex flex-wrap justify-between">
        <h1 className="text-xl font-bold mb-4">Simulation</h1>
        <Button>
          <Play />
          Start simulation
        </Button>
      </div>
      <Tabs defaultValue="boundary">
        <TabsList>
          <TabsTrigger value="boundary">Boundary conditions</TabsTrigger>
          <TabsTrigger value="initial">Initial conditions</TabsTrigger>
          <TabsTrigger value="soil">Soil</TabsTrigger>
        </TabsList>
        <TabsContent value="boundary">
          <BoundaryConditionsForm />
        </TabsContent>
        <TabsContent value="initial">
          <InitialConditionsGridEditor />
        </TabsContent>
        <TabsContent value="soil"></TabsContent>
      </Tabs>
    </div>
  );
}
