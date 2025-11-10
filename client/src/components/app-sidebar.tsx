import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { user, isAdmin, isOperator } = useAuth();
  const [location] = useLocation();

  const menuItems = [
    {
      title: "Dashboard",
      icon: "dashboard",
      url: "/",
      roles: ["user", "operator", "admin"],
    },
    {
      title: "Ferramentas",
      icon: "build",
      url: "/tools",
      roles: ["operator", "admin"],
    },
    {
      title: "Empréstimos",
      icon: "input",
      url: "/loans",
      roles: ["operator", "admin"],
    },
    {
      title: "Devoluções",
      icon: "output",
      url: "/returns",
      roles: ["operator", "admin"],
    },
    {
      title: "Inventário",
      icon: "inventory_2",
      url: "/inventory",
      roles: ["operator", "admin"],
    },
    {
      title: "Calibração",
      icon: "settings_suggest",
      url: "/calibration",
      roles: ["operator", "admin"],
    },
    {
      title: "Relatórios",
      icon: "assessment",
      url: "/reports",
      roles: ["operator", "admin"],
    },
    {
      title: "Usuários",
      icon: "people",
      url: "/users",
      roles: ["admin"],
    },
    {
      title: "Classes",
      icon: "category",
      url: "/classes",
      roles: ["admin"],
    },
    {
      title: "Modelos",
      icon: "label",
      url: "/models",
      roles: ["admin"],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || "user")
  );

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="material-icons text-primary text-2xl">build</span>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Sistema de</span>
            <span className="font-semibold text-sm">Ferramentaria</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`sidebar-${item.url.slice(1) || "home"}`}
                  >
                    <a href={item.url}>
                      <span className="material-icons text-base">{item.icon}</span>
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || ""} alt={user?.firstName || "User"} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          data-testid="button-logout"
          onClick={() => window.location.href = "/api/logout"}
        >
          <span className="material-icons text-sm mr-2">logout</span>
          Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
