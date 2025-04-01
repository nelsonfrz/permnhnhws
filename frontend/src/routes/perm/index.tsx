import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Menu, MenuItem, SubMenu } from '@spaceymonk/react-radial-menu';
import { Database, Gauge, Ruler, Settings } from 'lucide-react';
export const Route = createFileRoute('/perm/')({
  component: HomeComponent,
});

function HomeComponent() {
  const navigate = useNavigate();

  const handleItemClick = (_event: unknown, _index: unknown, data: unknown) => {
    console.log(`[MenuItem] ${data} clicked`);
    if (data == 'measure') {
      navigate({ to: '/perm/measure' });
    } else if (data == 'calibration') {
      navigate({ to: '/perm/calibration' });
    }
  };

  const handleSubMenuClick = (_event: unknown, _index: unknown, data: unknown) => {
    console.log(`[SubMenu] ${data} clicked`);
  };

  const handleDisplayClick = (_event: unknown, _position: unknown) => {
    console.log(`[Display] ${_position} clicked`);
  };

  return (
    <>
      <Menu
        centerX={400}
        centerY={400}
        innerRadius={200}
        outerRadius={400}
        show={true}
        animation={['fade', 'scale']}
        animationTimeout={500}
        drawBackground
        style={{ fontSize: '25px', fontWeight: 'bold' }}
      >
        <MenuItem onItemClick={handleItemClick} data="measure">
          <Gauge /> Measure
        </MenuItem>
        <MenuItem onItemClick={handleItemClick} data="storage">
          <Database /> Storage
        </MenuItem>
        <MenuItem onItemClick={handleItemClick} data="calibration">
          <Ruler /> Calibration
        </MenuItem>
        <SubMenu
          onDisplayClick={handleDisplayClick}
          onItemClick={handleSubMenuClick}
          itemView={
            <>
              <Settings />
              Settings
            </>
          }
          data="settings"
          displayPosition="bottom"
        >
          <MenuItem onItemClick={handleItemClick} data="settings">
            2.1. Item
          </MenuItem>
          <MenuItem onItemClick={handleItemClick} data="2.2. Item">
            2.2. Item
          </MenuItem>
          <MenuItem onItemClick={handleItemClick} data="2.3. Item">
            2.3. Item
          </MenuItem>
          <SubMenu
            onDisplayClick={handleDisplayClick}
            onItemClick={handleSubMenuClick}
            itemView="2.4. Sub Menu"
            data="2.4. Sub Menu"
            displayPosition="bottom"
          >
            <MenuItem onItemClick={handleItemClick} data="2.4.1. Item">
              2.4.1. Item
            </MenuItem>
            <MenuItem onItemClick={handleItemClick} data="2.4.2. Item">
              2.4.2. Item
            </MenuItem>
          </SubMenu>
        </SubMenu>
      </Menu>
      <div className="w-[800px] h-[800px] flex items-center justify-center select-none">
        <div className="flex -mt-10 items-center flex-col">
          <Gauge className="size-20" />
          <p className="font-bold text-2xl">PERM NHN HWS</p>
          <p className="text-muted-foreground">Nelson, Nour & Hadi</p>
          <div className="flex items-center">
            <img src="/Hws_logo.svg" width={120} height={50} />
            <img src="/Jugend_forscht.svg" width={120} height={50} />
          </div>
        </div>
      </div>
    </>
  );
}
