import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit2, Folder, Trash2 } from 'lucide-react';

interface Project {
  id: string;
  project_name: string;
  title: string;
  description: string;
  service_groups: string[];
  created_at: string;
  is_active: boolean;
}

interface ProjectTabsProps {
  onProjectChange?: (projectId: string | null) => void;
  className?: string;
}

export const ProjectTabs: React.FC<ProjectTabsProps> = ({ onProjectChange, className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      if (data && data.length > 0 && !activeProject) {
        setActiveProject(data[0].id);
        onProjectChange?.(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!user || !newProjectName.trim()) return;

    try {
      // Save current project state if exists
      if (activeProject) {
        // This would save the current form data - implementation depends on parent component
      }

      const { data, error } = await supabase
        .from('projects')
        .insert({
          client_id: user.id,
          project_name: newProjectName.trim(),
          title: newProjectName.trim(),
          description: `New project: ${newProjectName.trim()}`,
          status: 'draft',
          service_groups: [],
          form_data: {},
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => [data, ...prev]);
      setActiveProject(data.id);
      setNewProjectName('');
      setIsCreateDialogOpen(false);
      onProjectChange?.(data.id);

      toast({
        title: 'Project Created',
        description: `"${newProjectName}" has been created successfully.`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive'
      });
    }
  };

  const renameProject = async (projectId: string, newName: string) => {
    if (!newName.trim()) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          project_name: newName.trim(),
          title: newName.trim() 
        })
        .eq('id', projectId)
        .eq('client_id', user?.id);

      if (error) throw error;

      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, project_name: newName.trim(), title: newName.trim() }
          : p
      ));

      setEditingProject(null);
      setEditName('');

      toast({
        title: 'Project Renamed',
        description: 'Project name updated successfully.'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to rename project',
        variant: 'destructive'
      });
    }
  };

  const handleProjectChange = (projectId: string) => {
    setActiveProject(projectId);
    onProjectChange?.(projectId);
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading projects...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Project Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <Tabs value={activeProject || ''} onValueChange={handleProjectChange} className="flex-1">
          <div className="flex items-center gap-2">
            <TabsList className="h-10">
              {projects.map((project) => (
                <TabsTrigger 
                  key={project.id} 
                  value={project.id}
                  className="relative group px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    {editingProject === project.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => {
                          if (editName.trim()) {
                            renameProject(project.id, editName);
                          } else {
                            setEditingProject(null);
                            setEditName('');
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            renameProject(project.id, editName);
                          } else if (e.key === 'Escape') {
                            setEditingProject(null);
                            setEditName('');
                          }
                        }}
                        className="w-24 h-6 text-xs"
                        autoFocus
                      />
                    ) : (
                      <span 
                        className="truncate max-w-24 cursor-pointer" 
                        onDoubleClick={() => {
                          setEditingProject(project.id);
                          setEditName(project.project_name);
                        }}
                      >
                        {project.project_name}
                      </span>
                    )}
                    {activeProject === project.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-4 h-4 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project.id);
                          setEditName(project.project_name);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* New Project Button */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project-name">Project Name</Label>
                    <Input
                      id="project-name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          createProject();
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={createProject} 
                      disabled={!newProjectName.trim()}
                      className="flex-1"
                    >
                      Create Project
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setNewProjectName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Tabs>
      </div>

      {/* Project Info */}
      {activeProject && (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {projects.find(p => p.id === activeProject)?.project_name}
              </span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Created: {new Date(projects.find(p => p.id === activeProject)?.created_at || '').toLocaleDateString()}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};