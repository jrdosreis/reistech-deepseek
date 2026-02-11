describe('Login', () => {
  it('carrega a tela de login', () => {
    cy.visit('/login');
    cy.contains('ReisTech Painel').should('be.visible');
    cy.contains('Entrar').should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');
  });
});
