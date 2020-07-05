const Usuario = require('../models/Usuario');
const Proyecto = require('../models/Proyecto');
const Tarea = require('../models/Tarea');

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'variables.env'});

//Crea y firma un JWT
const crearToken = (usuario, secreta, expiresIn) => {
    const { id, email, nombre} = usuario;
    return jwt.sign({id, email, nombre}, secreta, {expiresIn});
}

const resolvers = {
    Query: {
       obtenerProyectos: async (_,{}, ctx) => {
        const proyectos = await Proyecto.find({creador: ctx.usuario.id});
        return proyectos;
       },
       obtenerTareas: async (_,{input}, ctx) => {
        const tareas = await Tarea.find({creador: ctx.usuario.id}).where('proyecto').equals(input.proyecto);
        return tareas;
       }
    },
    Mutation: {
        crearUsuario: async (_,{input}) => {
            const {email, password } = input;
            const existeUsuario = await Usuario.findOne({email});
            
            //Si el usuario ya existe
            if(existeUsuario) {
                throw new Error('El usuario ya está registrado');   
            }

            try {
                //Hashear Password
                const salt = await bcryptjs.genSalt(10);
                input.password = await bcryptjs.hash(password, salt); 
                //Registrar nuevo usuario
                const nuevoUsuario = new Usuario(input);
                nuevoUsuario.save();
                return 'Usuario creado correctamente';
            } catch (error) {
                console.log(error);
            }
        },
        autenticarUsuario: async (_,{input}) => {
            const {email, password } = input;
            
            //Si el usuario existe
            const existeUsuario = await Usuario.findOne({email});
            if(!existeUsuario) {
                throw new Error('El usuario no existe');
            }
            //Si el password es correcto
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
            if (!passwordCorrecto){
                throw new Error('Password incorrecto');
            }
            //Dar acceso a la app
            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '4hr')
            };
        },
        nuevoProyecto: async (_,{input}, ctx) => {
            try {
                const proyecto = new Proyecto(input)
                
                //Asociar al creador
                proyecto.creador = ctx.usuario.id;

                //Almacenarlo en la BD
                const resultado = await proyecto.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarProyecto: async (_,{id, input}, ctx) => {
            //Revisar que el proyecto existe
            let proyecto = await Proyecto.findById(id);
            if (!proyecto) {
                throw new Error('Proyecto no encontrado');
            }
            //Revisar si la persona que trata de editarlo es el creador
            if (proyecto.creador.toString() !== ctx.usuario.id) {
                throw new Error('No tienes permiso para editar éste proyecto');
            }
            //Guardar el proyecto
            proyecto = await Proyecto.findByIdAndUpdate({_id: id}, input, {new: true });
            return proyecto;
        },
        eliminarProyecto: async (_,{id}, ctx) => {
            //Revisar que el proyecto existe
            let proyecto = await Proyecto.findById(id);
            if (!proyecto) {
                throw new Error('Proyecto no encontrado');
            }
            //Revisar si la persona que trata de editarlo es el creador
            if (proyecto.creador.toString() !== ctx.usuario.id) {
                throw new Error('No tienes permiso para eliminar éste proyecto');
            }
            //Eliminar
            await Proyecto.findOneAndDelete({_id: id});
            
            return "Proyecto eliminado";
        },
        nuevaTarea: async (_,{input}, ctx) => {
            try {
                const tarea = new Tarea(input)
                
                //Asociar al creador
                tarea.creador = ctx.usuario.id;

                //Almacenarlo en la BD
                const resultado = await tarea.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarTarea: async (_,{id, input, estado}, ctx) => {
            //Revisar que la tarea existe
            let tarea = await Tarea.findById(id);
            if (!tarea) {
                throw new Error('Tarea no encontrada');
            }
            //Revisar si la persona que trata de editarla es el creador
            if (tarea.creador.toString() !== ctx.usuario.id) {
                throw new Error('No tienes permiso para editar ésta tarea');
            }
            //Asignar estado
            input.estado = estado;
            //Guardar y retornan la tarea
            tarea = await Tarea.findOneAndUpdate({_id: id}, input, {new: true });
            return tarea;
        },
        eliminarTarea: async (_,{id}, ctx) => {
            //Revisar que el proyecto existe
            let tarea = await Tarea.findById(id);
            if (!tarea) {
                throw new Error('Tarea no encontrada');
            }
            //Revisar si la persona que trata de editarlo es el creador
            if (tarea.creador.toString() !== ctx.usuario.id) {
                throw new Error('No tienes permiso para eliminar ésta tarea');
            }
            //Eliminar
            await Tarea.findOneAndDelete({_id: id});
            
            return "Tarea eliminada";
        }
    }
};

module.exports = resolvers;