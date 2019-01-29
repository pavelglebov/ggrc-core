export default function(context) {
  return {
    CallExpression(node) {
        let callee = node.callee;
        if (callee.object && callee.property) {

          if ((callee.object.name === "can" &&
          callee.property.name === "Component") ||
          (callee.object.object &&
          callee.object.object.name === "can" &&
          callee.object.property &&
          callee.object.property.name == "Component" &&
          callee.property.name === "extend")) {

            if (node.arguments[0]) {
              if (node.arguments[0].type === 'ObjectExpression') {
                  let leakScopeSpecified = node.arguments[0].properties.find(prop => prop.key.name === 'leakScope');

                  if (!leakScopeSpecified) {
                    context.report(node, "can.Component was created without leakScope specified");
                  }
              } else if (node.arguments[0].type === 'Identifier') {
                let idf = node.arguments[0].name;
                let variables = context.getDeclaredVariables(node);
                context.report(node, variables);
                         
              }
            }
          }
        }
      }
  };
};
