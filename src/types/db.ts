// Generated from the Supabase schema (project ref mnvntttootxbbbnsnvke).
// Regenerate with the Supabase CLI / MCP after any schema change. Do not edit by hand.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string;
          created_at: string;
          event_date: string | null;
          event_location: string | null;
          event_title: string | null;
          id: string;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          event_date?: string | null;
          event_location?: string | null;
          event_title?: string | null;
          id?: string;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          event_date?: string | null;
          event_location?: string | null;
          event_title?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [];
      };
      buildings: {
        Row: {
          created_at: string;
          geometry: Json | null;
          id: string;
          label: string;
          level: number;
        };
        Insert: {
          created_at?: string;
          geometry?: Json | null;
          id: string;
          label: string;
          level?: number;
        };
        Update: {
          created_at?: string;
          geometry?: Json | null;
          id?: string;
          label?: string;
          level?: number;
        };
        Relationships: [];
      };
      locker_sections: {
        Row: {
          building_id: string | null;
          created_at: string;
          id: string;
          label: string | null;
          map_coord: Json | null;
          number_end: number;
          number_start: number;
          panorama_id: string | null;
        };
        Insert: {
          building_id?: string | null;
          created_at?: string;
          id: string;
          label?: string | null;
          map_coord?: Json | null;
          number_end: number;
          number_start: number;
          panorama_id?: string | null;
        };
        Update: {
          building_id?: string | null;
          created_at?: string;
          id?: string;
          label?: string | null;
          map_coord?: Json | null;
          number_end?: number;
          number_start?: number;
          panorama_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'locker_sections_building_id_fkey';
            columns: ['building_id'];
            isOneToOne: false;
            referencedRelation: 'buildings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'locker_sections_panorama_id_fkey';
            columns: ['panorama_id'];
            isOneToOne: false;
            referencedRelation: 'panoramas';
            referencedColumns: ['id'];
          },
        ];
      };
      lockers: {
        Row: {
          created_at: string;
          hotspot_pitch: number | null;
          hotspot_yaw: number | null;
          id: string;
          number: number | null;
          section_id: string;
        };
        Insert: {
          created_at?: string;
          hotspot_pitch?: number | null;
          hotspot_yaw?: number | null;
          id: string;
          number?: number | null;
          section_id: string;
        };
        Update: {
          created_at?: string;
          hotspot_pitch?: number | null;
          hotspot_yaw?: number | null;
          id?: string;
          number?: number | null;
          section_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lockers_section_id_fkey';
            columns: ['section_id'];
            isOneToOne: false;
            referencedRelation: 'locker_sections';
            referencedColumns: ['id'];
          },
        ];
      };
      master_schedule: {
        Row: {
          course: string;
          created_at: string;
          id: string;
          period: string;
          room_id: string | null;
          teacher_id: string | null;
        };
        Insert: {
          course: string;
          created_at?: string;
          id: string;
          period: string;
          room_id?: string | null;
          teacher_id?: string | null;
        };
        Update: {
          course?: string;
          created_at?: string;
          id?: string;
          period?: string;
          room_id?: string | null;
          teacher_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'master_schedule_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'master_schedule_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
        ];
      };
      panoramas: {
        Row: {
          created_at: string;
          hfov: number | null;
          id: string;
          image_url: string;
          initial_pitch: number | null;
          initial_yaw: number | null;
          label: string | null;
        };
        Insert: {
          created_at?: string;
          hfov?: number | null;
          id: string;
          image_url: string;
          initial_pitch?: number | null;
          initial_yaw?: number | null;
          label?: string | null;
        };
        Update: {
          created_at?: string;
          hfov?: number | null;
          id?: string;
          image_url?: string;
          initial_pitch?: number | null;
          initial_yaw?: number | null;
          label?: string | null;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          building_id: string;
          created_at: string;
          id: string;
          label: string | null;
          teacher_id: string | null;
        };
        Insert: {
          building_id: string;
          created_at?: string;
          id: string;
          label?: string | null;
          teacher_id?: string | null;
        };
        Update: {
          building_id?: string;
          created_at?: string;
          id?: string;
          label?: string | null;
          teacher_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rooms_building_id_fkey';
            columns: ['building_id'];
            isOneToOne: false;
            referencedRelation: 'buildings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rooms_teacher_id_fkey';
            columns: ['teacher_id'];
            isOneToOne: false;
            referencedRelation: 'teachers';
            referencedColumns: ['id'];
          },
        ];
      };
      teachers: {
        Row: {
          created_at: string;
          home_room_id: string | null;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          home_room_id?: string | null;
          id: string;
          name: string;
        };
        Update: {
          created_at?: string;
          home_room_id?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'teachers_home_room_id_fkey';
            columns: ['home_room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_announcements_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
