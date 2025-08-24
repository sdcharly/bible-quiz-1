"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  Mail,
  Calendar,
  User,
  ArrowLeft,
  Phone
} from "lucide-react";

interface GroupMember {
  id: string;
  name: string | null;
  email: string;
  phoneNumber: string | null;
  joinedAt: string;
}

interface GroupDetails {
  id: string;
  name: string;
  description?: string;
  educatorId: string;
  educatorName?: string;
  educatorEmail?: string;
  createdAt: string;
  members: GroupMember[];
}

export default function AdminGroupDetailsPage() {
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
      fetchGroupDetails(params.id as string);
    }
  }, [params.id]);

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const response = await fetch(`/api/admin/groups/${groupId}`);
      if (response.ok) {
        const data = await response.json();
        setGroup(data.group);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch group details",
          variant: "destructive"
        });
        router.push("/admin/groups");
      }
    } catch (error) {
      console.error("Error fetching group details:", error);
      toast({
        title: "Error",
        description: "Network error fetching group details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Group not found
          </h2>
          <Button onClick={() => router.push("/admin/groups")}>
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.push("/admin/groups")}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {group.name}
              </h1>
              {group.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {group.description}
                </p>
              )}
              <div className="flex gap-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Created {new Date(group.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {group.members.length} members
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Educator Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Educator Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <User className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {group.educatorName || "Unknown Educator"}
                </div>
                <div className="text-sm text-gray-500">{group.educatorEmail}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Group Members</CardTitle>
            <CardDescription>
              All students enrolled in this group
            </CardDescription>
          </CardHeader>
          <CardContent>
            {group.members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No members in this group yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="font-medium">
                          {member.name || "Unnamed Student"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-2 text-gray-400" />
                          {member.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.phoneNumber ? (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-2 text-gray-400" />
                            {member.phoneNumber}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-500">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}