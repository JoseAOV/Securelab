import { Injectable } from '@angular/core';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface PerfilUsuario {
  matricula: string;
  nombre: string;
  carrera: string | null;
  rol: string;
  baneado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private sessionSubject = new BehaviorSubject<Session | null>(null);

  /** Emite la sesión actual (null si no hay usuario logueado). */
  session$: Observable<Session | null> = this.sessionSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();

    this.supabase.auth.getSession().then(({ data }) => {
      this.sessionSubject.next(data.session);
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionSubject.next(session);
    });
  }

  getSession(): Session | null {
    return this.sessionSubject.value;
  }

  /**
   * Verifica la sesión directamente contra Supabase (no el cache local).
   * Se usa en los route guards para evitar falsos negativos en la carga
   * inicial de la app, antes de que session$ se haya poblado.
   */
  async isAuthenticated(): Promise<boolean> {
    const { data } = await this.supabase.auth.getSession();
    return !!data.session;
  }

  /**
   * Inicia sesión con correo institucional y contraseña. Si la cuenta no
   * tiene un perfil vinculado (fue eliminada) o está baneada, se cierra
   * la sesión inmediatamente en vez de dejarla pasar.
   */
  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }

    const perfil = await this.getPerfilActual();
    if (!perfil || perfil.baneado) {
      await this.signOut();
      return { error: 'Tu cuenta no tiene acceso o fue suspendida. Contacta a un administrador.' };
    }

    return { error: null };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }

  /**
   * Verifica si una matrícula existe en usuarios_universidad y todavía no
   * tiene ninguna cuenta vinculada. Es solo para feedback rápido en el
   * formulario — la garantía real contra condiciones de carrera la hace
   * el trigger `handle_new_user` en la base de datos.
   */
  async matriculaDisponible(matricula: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('matricula_disponible', {
      p_matricula: matricula,
    });
    if (error) {
      console.error('Error al validar la matrícula:', error);
      return false;
    }
    return !!data;
  }

  /**
   * Crea la cuenta y, del lado de la base de datos (trigger
   * handle_new_user), reclama la fila de usuarios_universidad con esa
   * matrícula. Si la matrícula es inválida o ya tiene cuenta, la creación
   * completa se revierte y aquí llega como error.
   */
  async signUp(
    email: string,
    password: string,
    matricula: string
  ): Promise<{ error: string | null; necesitaConfirmarCorreo: boolean }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { matricula } },
    });

    if (error) {
      return { error: error.message, necesitaConfirmarCorreo: false };
    }

    return { error: null, necesitaConfirmarCorreo: !data.session };
  }

  async solicitarRecuperacionContrasena(email: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  }

  /**
   * Obtiene el perfil (matrícula, nombre, rol) de usuarios_universidad
   * ligado a la sesión de Supabase Auth actual.
   */
  async getPerfilActual(): Promise<PerfilUsuario | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('usuarios_universidad')
      .select('matricula, nombre, carrera, rol, baneado')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !data) {
      console.error('Error al obtener el perfil del usuario:', error);
      return null;
    }

    return data;
  }
}
